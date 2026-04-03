import { buildRouteAnalysisSummary, getLatestSuiteRecords } from '../../benchmark/history';
import type {
  CameraViewState,
  HighlightOverlayViewState,
  PresetPanelViewState,
  RouteControlsViewState,
  RouteDiagnosticsViewState,
  VariantPanelViewState
} from './types';
import type { RouteRunRecord } from '../../benchmark/types';
import type { BenchmarkRoute, ViewerVariant } from '../../content/types';
import type { Vector3Like } from '../../runtime/types';
import {
  formatSceneLookSummary,
} from '../../runtime/scene-look';
import {
  formatMetricMs,
  formatMetricPeakMs,
  formatRouteRunStatus,
  formatRouteRunTime,
  formatVec3
} from '../../utils/format';
import type { SceneLookSettings } from '../../runtime/scene-look';
import { radToDeg } from '../../utils/math';
import { useViewerUiStore } from './viewer-ui-store';

interface SyncVariantPanelOptions {
  variants: ViewerVariant[];
  activeVariantId: string;
  defaultVariant: ViewerVariant;
  disabled: boolean;
}

interface SyncPresetPanelOptions {
  presets: Array<{ id: string; name: string; summary: string }>;
  activePresetId: string;
  firstPreset: { id: string; name: string };
}

interface SyncRouteControlsOptions {
  benchmarkRoutes: BenchmarkRoute[];
  selectedRouteId: string | null;
  activeRouteId: string | null;
  routeSummaryText: string;
  variantCount: number;
  isBatchBenchmarkRunning: boolean;
  currentVariantRepeatCount: number;
}

interface SyncRouteDiagnosticsOptions {
  routeRunHistory: RouteRunRecord[];
  routeAnalysisCopyNoteOverride: string | null;
}

interface OrbitSnapshotLike {
  camera: {
    getPosition: () => Vector3Like;
  };
  currentTarget: Vector3Like;
  currentDistance: number;
  currentPitch: number;
  currentYaw: number;
}

interface CameraRuntimeLike {
  camera?: {
    camera?: {
      fov: number;
      nearClip: number;
      farClip: number;
      screenToWorld: (x: number, y: number, z: number, out: Vector3Like) => Vector3Like;
    } | null;
  } | null;
  canvasElement?: HTMLCanvasElement | null;
  orbit?: OrbitSnapshotLike | null;
  lastCameraSnapshot?: string;
}

interface SyncHighlightOverlayOptions {
  items: HighlightOverlayViewState['items'];
}

function syncVariantPanelState(options: SyncVariantPanelOptions): VariantPanelViewState {
  const { variants, activeVariantId, defaultVariant, disabled } = options;
  const activeVariant = variants.find((variant) => variant.id === activeVariantId) ?? defaultVariant;
  const state = {
    summary: activeVariant.name,
    items: variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      meta: `${variant.size} · ${variant.retention}`,
      isActive: variant.id === activeVariantId,
      disabled
    }))
  };

  useViewerUiStore.getState().setVariantPanel(state);
  return state;
}

function syncPresetPanelState(options: SyncPresetPanelOptions): PresetPanelViewState {
  const { presets, activePresetId, firstPreset } = options;
  const activePreset = presets.find((preset) => preset.id === activePresetId) ?? firstPreset;
  const state = {
    summary: activePreset.name,
    items: presets.map((preset) => ({
      id: preset.id,
      name: preset.name,
      summary: preset.summary,
      isActive: preset.id === activePresetId
    }))
  };

  useViewerUiStore.getState().setPresetPanel(state);
  return state;
}

function syncRouteControlsState(options: SyncRouteControlsOptions): RouteControlsViewState {
  const {
    benchmarkRoutes,
    selectedRouteId,
    activeRouteId,
    routeSummaryText,
    variantCount,
    isBatchBenchmarkRunning,
    currentVariantRepeatCount
  } = options;
  const selectedRoute = selectedRouteId
    ? benchmarkRoutes.find((route) => route.id === selectedRouteId) ?? null
    : null;
  const state = {
    summary: routeSummaryText,
    batchNote: selectedRoute
      ? `${selectedRoute.name} · 当前版本或 ${variantCount} 个版本`
      : '先选择一条轨迹，再批量跑所有版本。',
    runCurrentLabel: isBatchBenchmarkRunning ? '测试运行中…' : `跑当前轨迹 × 当前版本 ×${currentVariantRepeatCount}`,
    runSuiteLabel: isBatchBenchmarkRunning ? '标准测试运行中…' : '跑当前轨迹 × 全版本',
    runCurrentDisabled: isBatchBenchmarkRunning || benchmarkRoutes.length === 0,
    runSuiteDisabled: isBatchBenchmarkRunning || benchmarkRoutes.length === 0,
    items: benchmarkRoutes.map((route) => ({
      id: route.id,
      name: route.name,
      summary: route.summary,
      isActive: route.id === selectedRouteId,
      isRunning: route.id === activeRouteId,
      disabled: isBatchBenchmarkRunning
    }))
  };

  useViewerUiStore.getState().setRouteControls(state);
  return state;
}

function buildRouteDiagnosticsState(
  options: SyncRouteDiagnosticsOptions
): RouteDiagnosticsViewState {
  const { routeRunHistory, routeAnalysisCopyNoteOverride } = options;
  const logItems = routeRunHistory.map((entry) => ({
    id: entry.id,
    routeName: entry.routeName,
    status: entry.status ?? 'pending',
    statusLabel: formatRouteRunStatus(entry.status),
    meta: `${entry.variantName} · ${entry.renderScalePercent}% · ${formatRouteRunTime(entry.finishedAt ?? entry.startedAt)}`,
    motionText: `漫游 ${formatMetricMs(entry.motionAvgMs)} / ${formatMetricPeakMs(entry.motionMaxMs)}`,
    firstFrameText: `首帧 ${formatMetricMs(entry.firstFrameMs)}`
  }));
  const records = getLatestSuiteRecords(routeRunHistory);

  if (records.length === 0) {
    return {
      logSummary: routeRunHistory.length > 0 ? `${routeRunHistory.length} 条` : '暂无',
      logItems,
      logEmptyText: routeRunHistory.length === 0 ? '跑一次轨迹后，这里会自动留下对比记录。' : null,
      analysisSummary: '等待批量测试',
      copyNote: routeAnalysisCopyNoteOverride ?? '跑完一轮标准测试后可复制。',
      rankingItems: [],
      rankingEmptyText: '运行“当前轨迹 × 全版本”后，这里会出现排行榜和卡顿热点。',
      hotspotItems: [],
      hotspotEmptyText: null
    };
  }

  const summary = buildRouteAnalysisSummary(records);
  return {
    logSummary: `${routeRunHistory.length} 条`,
    logItems,
    logEmptyText: null,
    analysisSummary: `${summary.routeName} · ${records.length} 版`,
    copyNote: routeAnalysisCopyNoteOverride ?? `最新批次：${summary.suiteId} · 可复制或下载`,
    rankingItems: summary.ranking.map((item) => ({
      id: `${summary.suiteId}:${item.variantId}`,
      variantName: item.variantName,
      avgMs: item.avgMs,
      peakMs: item.peakMs,
      p95Ms: item.p95Ms,
      p99Ms: item.p99Ms,
      stallCount: item.stallCount,
      worstStepLabel: item.worstStepLabel,
      worstStepP95Ms: item.worstStepP95Ms,
      worstStepPeakMs: item.worstStepPeakMs
    })),
    rankingEmptyText: null,
    hotspotItems: summary.hotspots.map((hotspot) => ({
      id: `${summary.suiteId}:${hotspot.variantId}:${hotspot.stepLabel}:${hotspot.startMs ?? 'na'}`,
      variantName: hotspot.variantName,
      peakMs: hotspot.peakMs,
      stepLabel: hotspot.stepLabel,
      likelyCause: hotspot.likelyCause,
      startMs: hotspot.startMs,
      endMs: hotspot.endMs,
      longTaskCount: hotspot.longTaskCount,
      modelResourceCount: hotspot.modelResourceCount,
      cameraDistance: hotspot.camera.distance,
      cameraPitch: hotspot.camera.pitch,
      cameraYaw: hotspot.camera.yaw,
      resourceSummary: hotspot.resourceSummary
    })),
    hotspotEmptyText: summary.hotspots.length === 0 ? '这一批次还没采到明显卡顿热点。' : null
  };
}

function syncRouteDiagnosticsState(options: SyncRouteDiagnosticsOptions): RouteDiagnosticsViewState {
  const state = buildRouteDiagnosticsState(options);
  useViewerUiStore.getState().setRouteDiagnostics(state);
  return state;
}

function buildCameraState(pc: any, runtimeState: CameraRuntimeLike): CameraViewState | null {
  if (!runtimeState?.orbit) {
    return {
      summary: '等待视角',
      position: '—',
      target: '—',
      distance: '—',
      angle: '—',
      positionValue: null,
      targetValue: null,
      visibleGroundPolygonValue: [],
      distanceValue: null,
      pitchValue: null,
      yawValue: null
    };
  }

  const { orbit } = runtimeState;
  const cameraComponent = runtimeState.camera?.camera;
  const canvasRect = runtimeState.canvasElement?.getBoundingClientRect();
  const position = orbit.camera.getPosition();
  const target = orbit.currentTarget;
  const distance = orbit.currentDistance;
  const pitch = Math.round(radToDeg(orbit.currentPitch));
  const yaw = Math.round(radToDeg(orbit.currentYaw));
  const visibleGroundPolygon = buildVisibleGroundPolygon(
    pc,
    runtimeState,
    Math.max(target.y, 0)
  );
  const snapshot = [
    position.x.toFixed(2),
    position.y.toFixed(2),
    position.z.toFixed(2),
    target.x.toFixed(2),
    target.y.toFixed(2),
    target.z.toFixed(2),
    distance.toFixed(2),
    pitch,
    yaw,
    canvasRect?.width?.toFixed?.(0) ?? '0',
    canvasRect?.height?.toFixed?.(0) ?? '0',
    cameraComponent?.fov?.toFixed?.(2) ?? '0',
    visibleGroundPolygon
      .map((point) => `${point[0].toFixed(2)},${point[2].toFixed(2)}`)
      .join(';')
  ].join('|');

  if (runtimeState.lastCameraSnapshot === snapshot) {
    return null;
  }

  runtimeState.lastCameraSnapshot = snapshot;
  return {
    summary: `${distance.toFixed(2)} m · ${pitch}°`,
    position: formatVec3(position),
    target: formatVec3(target),
    distance: `${distance.toFixed(2)} m`,
    angle: `${pitch}° / ${yaw}°`,
    positionValue: [position.x, position.y, position.z],
    targetValue: [target.x, target.y, target.z],
    visibleGroundPolygonValue: visibleGroundPolygon,
    distanceValue: distance,
    pitchValue: pitch,
    yawValue: yaw
  };
}

function buildVisibleGroundPolygon(
  pc: any,
  runtimeState: CameraRuntimeLike,
  planeY: number
) {
  const cameraComponent = runtimeState.camera?.camera;
  const canvasElement = runtimeState.canvasElement;

  if (!cameraComponent || !canvasElement) {
    return [];
  }

  const rect = canvasElement.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return [];
  }

  const samples: Array<[number, number]> = [
    [0, rect.height],
    [rect.width * 0.5, rect.height],
    [rect.width, rect.height],
    [rect.width, rect.height * 0.5],
    [rect.width, 0],
    [rect.width * 0.5, 0],
    [0, 0],
    [0, rect.height * 0.5]
  ];

  return samples
    .map(([screenX, screenY]) =>
      intersectScreenRayWithGround(pc, cameraComponent, screenX, screenY, planeY)
    )
    .filter(isFiniteGroundPoint);
}

function intersectScreenRayWithGround(
  pc: any,
  cameraComponent: NonNullable<NonNullable<CameraRuntimeLike['camera']>['camera']>,
  screenX: number,
  screenY: number,
  planeY: number
): [number, number, number] | null {
  const rayStart = cameraComponent.screenToWorld(
    screenX,
    screenY,
    cameraComponent.nearClip,
    new pc.Vec3()
  );
  const rayEnd = cameraComponent.screenToWorld(
    screenX,
    screenY,
    cameraComponent.farClip,
    new pc.Vec3()
  );
  const rayDirection = new pc.Vec3().sub2(rayEnd, rayStart);
  const hasGroundHit = Math.abs(rayDirection.y) > 1e-5;
  const t = hasGroundHit ? (planeY - rayStart.y) / rayDirection.y : Number.NaN;

  if (Number.isFinite(t) && t > 0) {
    const hitPoint: [number, number, number] = [
      rayStart.x + rayDirection.x * t,
      planeY,
      rayStart.z + rayDirection.z * t
    ];
    return isFiniteGroundPoint(hitPoint) ? hitPoint : null;
  }

  const fallbackPoint: [number, number, number] = [rayEnd.x, planeY, rayEnd.z];
  return isFiniteGroundPoint(fallbackPoint) ? fallbackPoint : null;
}

function isFiniteGroundPoint(
  point: [number, number, number] | null | undefined
): point is [number, number, number] {
  return Boolean(
    point &&
    Number.isFinite(point[0]) &&
    Number.isFinite(point[1]) &&
    Number.isFinite(point[2])
  );
}

function syncCameraState(pc: any, runtimeState: CameraRuntimeLike): CameraViewState | null {
  const state = buildCameraState(pc, runtimeState);
  if (state) {
    useViewerUiStore.getState().setCamera(state);
  }

  return state;
}

function syncHighlightOverlayState(
  options: SyncHighlightOverlayOptions
): HighlightOverlayViewState {
  const state = {
    items: options.items
  };

  useViewerUiStore.getState().setHighlightOverlay(state);
  return state;
}

function setPresetPanelSummary(summary: string) {
  const presetPanel = useViewerUiStore.getState().presetPanel;
  if (!presetPanel) {
    return;
  }

  useViewerUiStore.getState().setPresetPanel({
    ...presetPanel,
    summary
  });
}

function setViewerStatus(title: string, detail: string) {
  useViewerUiStore.getState().setStatus({
    title,
    detail
  });
}

function setViewerLoading(mode: 'boot' | 'switch' = 'switch') {
  useViewerUiStore.getState().setLoading({
    visible: true,
    mode
  });
}

function clearViewerLoading() {
  useViewerUiStore.getState().setLoading({
    visible: false,
    mode: 'switch'
  });
}

function syncSceneLookState(sceneLook: SceneLookSettings) {
  useViewerUiStore.getState().setSceneLook({
    summary: formatSceneLookSummary(sceneLook),
    brightnessPercent: sceneLook.brightnessPercent,
    contrastPercent: sceneLook.contrastPercent,
    saturationPercent: sceneLook.saturationPercent,
    brightnessValue: `${sceneLook.brightnessPercent}%`,
    contrastValue: `${sceneLook.contrastPercent}%`,
    saturationValue: `${sceneLook.saturationPercent}%`
  });
}

export {
  buildCameraState,
  buildRouteDiagnosticsState,
  clearViewerLoading,
  setPresetPanelSummary,
  setViewerLoading,
  setViewerStatus,
  syncCameraState,
  syncHighlightOverlayState,
  syncPresetPanelState,
  syncRouteControlsState,
  syncRouteDiagnosticsState,
  syncSceneLookState,
  syncVariantPanelState
};
