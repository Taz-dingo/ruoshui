import { triggerFileDownload } from '../platform/file-download';
import { useViewerUiStore } from '../ui/state/viewer-ui-store';
import type {
  CameraPreset,
  MiniMapConfig,
  ViewerHighlight,
  ViewerVariant
} from '../content/types';

interface ViewCaptureRecord {
  id: string;
  label: string;
  capturedAt: string;
  variantId: string;
  variantName: string;
  presetId: string | null;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    visibleGroundPolygon: [number, number, number][];
    distance: number;
    pitchDeg: number;
    yawDeg: number;
  };
  imageDataUrl: string;
}

interface ViewCaptureMapSample {
  id: string;
  label: string;
  camera: [number, number];
  target: [number, number];
  footprint: Array<[number, number]>;
}

interface ViewCaptureMapHints {
  focusAnchor: [number, number];
  sourceBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } | null;
  suggestedBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } | null;
  samples: ViewCaptureMapSample[];
}

interface ViewCaptureExportPayload {
  exportedAt: string;
  variantId: string;
  variantName: string;
  recordCount: number;
  mapHints: ViewCaptureMapHints;
  records: ViewCaptureRecord[];
}

interface SweepViewPreset {
  id: string;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

interface CreateViewCaptureControllerArgs {
  highlights?: ViewerHighlight[];
  presets: CameraPreset[];
  sceneMiniMap?: MiniMapConfig;
  variantsById: Map<string, ViewerVariant>;
  getRuntime: () => any;
  getActiveVariantId: () => string;
  moveCamera: (
    runtimeState: any,
    preset: Pick<CameraPreset, 'position' | 'target'>,
    immediate?: boolean
  ) => void;
  captureCurrentView: (runtimeState: any) => any;
  restoreCurrentView: (runtimeState: any, snapshot: any) => boolean;
  setStatus: (title: string, detail: string) => void;
}

const sweepCaptureMoveMs = 1550;
const sweepCaptureSettleMs = 420;
const expandedSweepMaxDistance = 4.4;
const captureAnalysisSize = 24;
const captureBlackFrameThreshold = 12;
const captureRetryCount = 4;
const captureRetryDelayMs = 140;

function createViewCaptureController({
  highlights = [],
  presets,
  sceneMiniMap,
  variantsById,
  getRuntime,
  getActiveVariantId,
  moveCamera,
  captureCurrentView,
  restoreCurrentView,
  setStatus
}: CreateViewCaptureControllerArgs) {
  let records: ViewCaptureRecord[] = [];
  let isRunning = false;

  const publishState = (overrides: Partial<{
    note: string;
    summary: string;
  }> = {}) => {
    const activeVariantId = getActiveVariantId();
    const activeVariant = variantsById.get(activeVariantId);

    useViewerUiStore.getState().setViewCapture({
      summary:
        overrides.summary ??
        (isRunning
          ? '采集中'
          : records.length > 0
            ? `${records.length} 张样本`
            : '未采集'),
      note:
        overrides.note ??
        (records.length > 0
          ? `${activeVariant?.name ?? activeVariantId} · 可下载 JSON，内含截图、相机参数和小地图轨迹信息。`
          : '移动到想看的位置后，可采当前视角；也可以自动全景扫一遍场景。'),
      isRunning,
      itemCount: records.length,
      items: records.map((record) => ({
        id: record.id,
        label: record.label,
        variantName: record.variantName,
        presetId: record.presetId
      }))
    });
  };

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms);
    });

  const waitForStableFrame = async (runtimeState: any) => {
    const orbit = runtimeState?.orbit;
    const startTime = performance.now();

    while (orbit?.transition && performance.now() - startTime < 2400) {
      runtimeState?.requestRender?.();
      await nextFrame();
    }

    runtimeState?.requestRender?.();
    await nextFrame();
    runtimeState?.requestRender?.();
    await nextFrame();
    runtimeState?.requestRender?.();
    await nextFrame();
    await sleep(70);
  };

  const buildCameraSnapshot = (runtimeState: any) => {
    const orbit = runtimeState?.orbit;
    const cameraState = useViewerUiStore.getState().camera;

    if (!orbit) {
      return null;
    }

    const position = orbit.camera.getPosition();
    const target = orbit.currentTarget;

    return {
      position: [position.x, position.y, position.z] as [number, number, number],
      target: [target.x, target.y, target.z] as [number, number, number],
      visibleGroundPolygon: cameraState.visibleGroundPolygonValue,
      distance: orbit.currentDistance,
      pitchDeg: Math.round((orbit.currentPitch * 180) / Math.PI),
      yawDeg: Math.round((orbit.currentYaw * 180) / Math.PI)
    };
  };

  const captureCanvasImage = async (runtimeState: any) => {
    const canvasElement = runtimeState?.canvasElement as HTMLCanvasElement | undefined;

    if (!canvasElement) {
      throw new Error('Missing canvas element');
    }

    for (let attempt = 0; attempt < captureRetryCount; attempt += 1) {
      await waitForStableFrame(runtimeState);
      const snapshot = await snapshotCanvasImage(canvasElement);

      if (!isLikelyBlackFrame(snapshot.analysisContext)) {
        return snapshot.dataUrl;
      }

      runtimeState?.requestRender?.();
      await sleep(captureRetryDelayMs * (attempt + 1));
    }

    throw new Error('Canvas capture stayed black after retries');
  };

  const buildSweepPresets = () => {
    const mapBounds = sceneMiniMap?.bounds ?? null;
    const baseTarget = resolveFocusAnchor({
      highlights,
      map: sceneMiniMap,
      presets
    });
    const worldRadius = mapBounds
      ? Math.max(mapBounds.maxX - mapBounds.minX, mapBounds.maxZ - mapBounds.minZ) * 0.5
      : 2.2;
    const farDistance = clamp(worldRadius * 1.28 + 0.7, 3.05, 3.85);
    const midDistance = clamp(worldRadius * 1.02 + 0.4, 2.45, 3.15);
    const highDistance = clamp(farDistance + 0.35, 3.3, 4.1);
    const ringAnglesDeg = [0, 45, 90, 135, 180, 225, 270, 315];

    const ringPresets: SweepViewPreset[] = ringAnglesDeg.map((angleDeg, index) => ({
      id: `sweep-ring-${index + 1}`,
      label: `环扫 ${index + 1}`,
      position: orbitToPositionTuple(baseTarget, angleDeg, 24, farDistance),
      target: baseTarget
    }));

    return [
      ...ringPresets,
      {
        id: 'sweep-overview-east',
        label: '高位东侧',
        position: orbitToPositionTuple(baseTarget, 35, 48, highDistance),
        target: baseTarget
      },
      {
        id: 'sweep-overview-west',
        label: '高位西侧',
        position: orbitToPositionTuple(baseTarget, 215, 48, highDistance),
        target: baseTarget
      },
      {
        id: 'sweep-mid-south',
        label: '贴近南侧',
        position: orbitToPositionTuple(baseTarget, 160, 16, midDistance),
        target: baseTarget
      },
      {
        id: 'sweep-mid-north',
        label: '贴近北侧',
        position: orbitToPositionTuple(baseTarget, 340, 16, midDistance),
        target: baseTarget
      }
    ];
  };

  const appendRecord = async ({
    label,
    presetId
  }: {
    label: string;
    presetId: string | null;
  }) => {
    const runtimeState = getRuntime();
    const activeVariantId = getActiveVariantId();
    const activeVariant = variantsById.get(activeVariantId);
    const camera = buildCameraSnapshot(runtimeState);

    if (!runtimeState || !camera) {
      throw new Error('Missing runtime camera');
    }

    const imageDataUrl = await captureCanvasImage(runtimeState);
    const record: ViewCaptureRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label,
      capturedAt: new Date().toISOString(),
      variantId: activeVariantId,
      variantName: activeVariant?.name ?? activeVariantId,
      presetId,
      camera,
      imageDataUrl
    };

    records = [...records, record];
    publishState({
      summary: `${records.length} 张样本`,
      note: `最新：${label} · ${record.variantName}`
    });

    return record;
  };

  const captureCurrentSample = async () => {
    if (isRunning) {
      return null;
    }

    isRunning = true;
    publishState({
      summary: '采集中',
      note: '正在截取当前视角…'
    });

    try {
      const record = await appendRecord({
        label: `当前视角 ${records.length + 1}`,
        presetId: null
      });
      setStatus('已采集当前视角', `${record.label} · ${record.variantName}`);
      return record;
    } finally {
      isRunning = false;
      publishState();
    }
  };

  const captureSweepSamples = async () => {
    if (isRunning) {
      return null;
    }

    const runtimeState = getRuntime();
    const sweepPresets = buildSweepPresets();

    if (!runtimeState || sweepPresets.length === 0) {
      setStatus('无法采集', '当前还没有可用运行时或扫场景路径。');
      return null;
    }

    isRunning = true;
    const restoreSnapshot = captureCurrentView(runtimeState);
    const originalMaxDistance = runtimeState.orbit?.maxDistance ?? null;

    if (runtimeState.orbit && Number.isFinite(originalMaxDistance)) {
      runtimeState.orbit.maxDistance = Math.max(
        originalMaxDistance,
        expandedSweepMaxDistance
      );
    }

    try {
      const startedAt = Date.now();
      const batchRecords: ViewCaptureRecord[] = [];

      for (let index = 0; index < sweepPresets.length; index += 1) {
        const preset = sweepPresets[index];
        publishState({
          summary: `采集中 ${index + 1}/${sweepPresets.length}`,
          note: `正在扫到「${preset.label}」并截图…`
        });
        moveCamera(runtimeState, preset, false);
        await sleep(sweepCaptureMoveMs);
        await sleep(sweepCaptureSettleMs);
        const record = await appendRecord({
          label: preset.label,
          presetId: preset.id
        });
        batchRecords.push(record);
      }

      const elapsedMs = Date.now() - startedAt;
      setStatus(
        '全景扫场景完成',
        `${batchRecords.length} 张 · ${(elapsedMs / 1000).toFixed(1)}s`
      );
      return batchRecords;
    } finally {
      restoreCurrentView(runtimeState, restoreSnapshot);
      if (runtimeState.orbit && Number.isFinite(originalMaxDistance)) {
        runtimeState.orbit.maxDistance = originalMaxDistance;
      }
      isRunning = false;
      publishState();
    }
  };

  const buildMapHints = (): ViewCaptureMapHints => {
    const focusAnchor = resolveFocusAnchor({
      highlights,
      map: sceneMiniMap,
      presets
    });
    const clippedRecords = records.map((record) => ({
      ...record,
      clippedFootprint: clipFootprintForMapHints(
        record.camera.visibleGroundPolygon,
        sceneMiniMap?.bounds ?? null,
        focusAnchor
      )
    }));
    const points = clippedRecords.flatMap((record) => [
      [record.camera.position[0], record.camera.position[2]] as [number, number],
      [record.camera.target[0], record.camera.target[2]] as [number, number],
      ...record.clippedFootprint.map((point) => [point[0], point[2]] as [number, number])
    ]);

    const suggestedBounds = points.length > 0
      ? {
          minX: Math.min(...points.map((point) => point[0])),
          maxX: Math.max(...points.map((point) => point[0])),
          minZ: Math.min(...points.map((point) => point[1])),
          maxZ: Math.max(...points.map((point) => point[1]))
        }
      : null;

    return {
      focusAnchor: [focusAnchor[0], focusAnchor[2]],
      sourceBounds: sceneMiniMap
        ? {
            minX: sceneMiniMap.bounds.minX,
            maxX: sceneMiniMap.bounds.maxX,
            minZ: sceneMiniMap.bounds.minZ,
            maxZ: sceneMiniMap.bounds.maxZ
          }
        : null,
      suggestedBounds,
      samples: clippedRecords.map((record) => ({
        id: record.id,
        label: record.label,
        camera: [record.camera.position[0], record.camera.position[2]],
        target: [record.camera.target[0], record.camera.target[2]],
        footprint: record.clippedFootprint.map(
          (point) => [point[0], point[2]] as [number, number]
        )
      }))
    };
  };

  const buildExportPayload = (): ViewCaptureExportPayload | null => {
    if (records.length === 0) {
      return null;
    }

    const activeVariantId = getActiveVariantId();
    const activeVariant = variantsById.get(activeVariantId);

    return {
      exportedAt: new Date().toISOString(),
      variantId: activeVariantId,
      variantName: activeVariant?.name ?? activeVariantId,
      recordCount: records.length,
      mapHints: buildMapHints(),
      records
    };
  };

  const downloadJson = () => {
    const payload = buildExportPayload();

    if (!payload) {
      setStatus('还没有可导出的样本', '先采当前视角，或自动扫一轮场景。');
      return;
    }

    const slug = payload.variantName
      .replace(/[^\p{Letter}\p{Number}-]+/gu, '-')
      .replace(/-+/g, '-');
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    });

    triggerFileDownload({
      blob,
      fileName: `ruoshui-view-captures-${slug}-${Date.now()}.json`
    });
    setStatus('已下载视角样本', `${payload.recordCount} 条记录`);
  };

  const clearRecords = () => {
    records = [];
    publishState({
      summary: '未采集',
      note: '已清空当前缓存。'
    });
  };

  const installBridge = () => {
    window.__ruoshuiViewCapture = {
      latest() {
        return buildExportPayload();
      },
      clear() {
        clearRecords();
      },
      async captureCurrent() {
        return captureCurrentSample();
      },
      async capturePresets() {
        return captureSweepSamples();
      },
      async captureSweep() {
        return captureSweepSamples();
      },
      downloadJson() {
        downloadJson();
      }
    };
  };

  publishState();

  return {
    captureCurrentSample,
    capturePresetSamples: captureSweepSamples,
    clearRecords,
    downloadJson,
    installBridge,
    publishState
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function orbitToPositionTuple(
  target: [number, number, number],
  yawDeg: number,
  pitchDeg: number,
  distance: number
): [number, number, number] {
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  const cosPitch = Math.cos(pitch);

  return [
    target[0] + Math.sin(yaw) * cosPitch * distance,
    Math.max(0, target[1] + Math.sin(pitch) * distance),
    target[2] + Math.cos(yaw) * cosPitch * distance
  ];
}

function resolveFocusAnchor({
  highlights,
  map,
  presets
}: {
  highlights: ViewerHighlight[];
  map?: MiniMapConfig;
  presets: CameraPreset[];
}): [number, number, number] {
  const presetTargets = presets.map((preset) => preset.target);
  const landmarkPoints = (map?.landmarks ?? []).map((landmark) => [landmark.x, 0, landmark.z] as [number, number, number]);
  const highlightPoints = highlights.map((highlight) => highlight.position);
  const candidates = [
    ...presetTargets,
    ...landmarkPoints,
    ...highlightPoints
  ];

  if (candidates.length === 0) {
    if (map) {
      return [
        (map.bounds.minX + map.bounds.maxX) * 0.5,
        0,
        (map.bounds.minZ + map.bounds.maxZ) * 0.5
      ];
    }

    return [0, 0, 0];
  }

  return [
    median(candidates.map((point) => point[0])),
    Math.max(0, median(candidates.map((point) => point[1]))),
    median(candidates.map((point) => point[2]))
  ];
}

function clipFootprintForMapHints(
  points: [number, number, number][],
  bounds: MiniMapConfig['bounds'] | null,
  focusAnchor: [number, number, number]
) {
  const fallbackRadius = 4.6;
  const maxSpan = bounds
    ? Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ)
    : fallbackRadius * 2;
  const clipRadius = Math.max(maxSpan * 0.95, fallbackRadius);

  return points.filter((point) => {
    const dx = point[0] - focusAnchor[0];
    const dz = point[2] - focusAnchor[2];
    return Math.hypot(dx, dz) <= clipRadius;
  });
}

function median(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sorted.length * 0.5);

  if (sorted.length % 2 === 0) {
    return (sorted[middleIndex - 1] + sorted[middleIndex]) * 0.5;
  }

  return sorted[middleIndex];
}

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

async function snapshotCanvasImage(canvasElement: HTMLCanvasElement) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(canvasElement);

    try {
      return createSnapshotFromDrawable(bitmap, canvasElement.width, canvasElement.height);
    } finally {
      bitmap.close();
    }
  }

  return createSnapshotFromDrawable(
    canvasElement,
    canvasElement.width,
    canvasElement.height
  );
}

function createSnapshotFromDrawable(
  drawable: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number
) {
  const width = Math.max(1, sourceWidth || 1);
  const height = Math.max(1, sourceHeight || 1);
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;
  const exportContext = exportCanvas.getContext('2d', {
    alpha: false,
    willReadFrequently: true
  });

  if (!exportContext) {
    throw new Error('Missing export canvas context');
  }

  exportContext.drawImage(drawable, 0, 0, width, height);

  const analysisCanvas = document.createElement('canvas');
  analysisCanvas.width = captureAnalysisSize;
  analysisCanvas.height = captureAnalysisSize;
  const analysisContext = analysisCanvas.getContext('2d', {
    alpha: false,
    willReadFrequently: true
  });

  if (!analysisContext) {
    throw new Error('Missing analysis canvas context');
  }

  analysisContext.drawImage(drawable, 0, 0, captureAnalysisSize, captureAnalysisSize);

  return {
    dataUrl: exportCanvas.toDataURL('image/webp', 0.92),
    analysisContext
  };
}

function isLikelyBlackFrame(context: CanvasRenderingContext2D) {
  const { data } = context.getImageData(
    0,
    0,
    context.canvas.width,
    context.canvas.height
  );
  let brightPixels = 0;

  for (let index = 0; index < data.length; index += 4) {
    const luma = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;

    if (luma > captureBlackFrameThreshold) {
      brightPixels += 1;
      if (brightPixels >= 3) {
        return false;
      }
    }
  }

  return true;
}

export {
  createViewCaptureController
};
