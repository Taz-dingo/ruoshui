import {
  cameraMetaIntervalSeconds,
  currentVariantRepeatCount,
  frameSampleIndices,
  lowAnglePrewarmDistanceThreshold,
  lowAnglePrewarmHoldSeconds,
  lowAnglePrewarmLeadSeconds,
  lowAnglePrewarmMaxSeconds,
  lowAnglePrewarmPitchThresholdDeg,
  maxRouteRunHistory,
  perfHudIntervalSeconds,
  renderWakeSeconds,
  routeAnalysisCopyFeedbackMs,
  routeRunHistoryStorageKey
} from './config';
import { buildRouteAnalysisSummary, formatRouteAnalysisSummaryText, getInitialRouteRunHistory, getLatestRouteAnalysisExport, getLatestSuiteRecords, persistRouteRunHistory } from './benchmark/history';
import {
  beginMotionSession,
  beginStoredVariantBenchmark,
  createBenchmarkRouteRunRecord,
  endMotionSession,
  finalizeBenchmarkRouteRunRecord,
  getStoredVariantBenchmark,
  initLongTaskObserver,
  recordBenchmarkRouteFrame,
  sampleMotionFrame,
  trackBenchmarkFirstFrame
} from './benchmark/runtime';
import { applyRenderScaleToRuntime, createPerformanceMode, getInitialRenderScalePercent, getMaxSupportedPixelRatio, normalizeRenderScalePercent, persistRenderScalePercent, updatePerformanceMode } from './performance/render-scale';
import { createLoopController } from './runtime/lifecycle';
import { captureOrbitView, createOrbitController, restoreOrbitView, setOrbitPreset, updateOrbitController } from './runtime/orbit';
import { detachVariantFromRuntime, loadVariantIntoRuntime } from './runtime/variant-loader';
import type { CameraViewState, RouteDiagnosticsViewState, RouteRunRecord, VariantBenchmark, ViewerContent } from './types';
import { useViewerUiStore } from './ui/viewer-ui-store';
import { requireElement } from './utils/dom';
import { formatMetricMs, formatMetricPeakMs, formatMotionMetric, formatRouteRunStatus, formatRouteRunTime, formatVec3 } from './utils/format';
import { clamp, radToDeg, roundNumber } from './utils/math';

const pc: any = await import(/* @vite-ignore */ 'https://esm.sh/playcanvas@2.17.2?bundle');

const data = window.__ruoshuiInitialData;

if (!data) {
  throw new Error('Missing initial viewer content');
}

const showPerfHud = import.meta.env.DEV;
const variantsById = new Map(data.variants.map((variant) => [variant.id, variant]));
const benchmarkRoutes = data.benchmarkRoutes ?? [];
const benchmarkRoutesById = new Map(benchmarkRoutes.map((route) => [route.id, route]));
const firstPreset = data.presets[0];
const defaultVariant = variantsById.get(data.scene.defaultVariantId) ?? data.variants[0];
const maxRenderScalePercent = Math.round(getMaxSupportedPixelRatio(window) * 100);
let activeRenderScalePercent = getInitialRenderScalePercent(window, maxRenderScalePercent);
const longTaskBuffer: Array<{ startTime: number; duration: number }> = [];

initLongTaskObserver(longTaskBuffer);

const sceneContainer = requireElement<HTMLDivElement>('#scene');
const routeList = requireElement<HTMLDivElement>('#route-list');
const runRouteCurrentVariantButton = requireElement<HTMLButtonElement>('#run-route-current-variant');
const runRouteSuiteButton = requireElement<HTMLButtonElement>('#run-route-suite');
const routeBatchNote = requireElement<HTMLElement>('#route-batch-note');
const copyRouteAnalysisSummaryButton = requireElement<HTMLButtonElement>('#copy-route-analysis-summary');
const copyRouteAnalysisJsonButton = requireElement<HTMLButtonElement>('#copy-route-analysis-json');
const downloadRouteAnalysisJsonButton = requireElement<HTMLButtonElement>('#download-route-analysis-json');
const renderScaleSlider = requireElement<HTMLInputElement>('#render-scale-slider');
const statusTitle = requireElement<HTMLElement>('#status-title');
const statusDetail = requireElement<HTMLElement>('#status-detail');
const variantSize = requireElement<HTMLElement>('#variant-size');
const variantSplats = requireElement<HTMLElement>('#variant-splats');
const variantRetention = requireElement<HTMLElement>('#variant-retention');
const variantTitle = requireElement<HTMLElement>('#variant-title');
const variantNote = requireElement<HTMLElement>('#variant-note');
const metricLoad = requireElement<HTMLElement>('#metric-load');
const metricFirstFrame = requireElement<HTMLElement>('#metric-first-frame');
const metricMotion = requireElement<HTMLElement>('#metric-motion');
const renderScaleValue = requireElement<HTMLElement>('#render-scale-value');
const renderScaleNote = requireElement<HTMLElement>('#render-scale-note');
const focusSceneButton = requireElement<HTMLButtonElement>('#focus-scene');
const focusOverviewButton = requireElement<HTMLButtonElement>('#focus-overview');
const qualitySummary = requireElement<HTMLElement>('#quality-summary');
const presetsSummary = requireElement<HTMLElement>('#presets-summary');
const routeSummary = requireElement<HTMLElement>('#route-summary');
const perfFps = showPerfHud ? requireElement<HTMLElement>('#perf-fps') : null;
const perfMs = showPerfHud ? requireElement<HTMLElement>('#perf-ms') : null;
const perfRender = showPerfHud ? requireElement<HTMLElement>('#perf-render') : null;
const perfScale = showPerfHud ? requireElement<HTMLElement>('#perf-scale') : null;
const inspectorToggles = [...document.querySelectorAll<HTMLButtonElement>('[data-toggle]')];
const inspectorBodies = new Map(
  [...document.querySelectorAll<HTMLElement>('[data-body]')]
    .map((element) => [element.dataset.body ?? '', element] as const)
    .filter(([panelId]) => panelId)
);
if (inspectorToggles.length === 0 || inspectorBodies.size === 0) {
  throw new Error('Failed to initialize UI shell');
}

let runtime: any = null;
let activePresetId = firstPreset.id;
let activeVariantId = defaultVariant.id;
let activeRouteId: string | null = null;
let selectedRouteId: string | null = benchmarkRoutes[0]?.id ?? null;
let currentLoadToken = 0;
let openInspectorPanel: string | null = null;
let isBatchBenchmarkRunning = false;
let activeSuiteRunId: string | null = null;
let routeAnalysisCopyTimeoutId: number | null = null;
let routeAnalysisCopyNoteOverride: string | null = null;
let activeBenchmarkRunPromise: Promise<any> | null = null;
let isVariantPanelDisabled = false;
let lastVariantSelectionSequence = useViewerUiStore.getState().variantSelectionRequest.sequence;
let lastPresetSelectionSequence = useViewerUiStore.getState().presetSelectionRequest.sequence;

const routeButtons = new Map();
const variantBenchmarks = new Map<string, VariantBenchmark>();
const routeRunHistory: RouteRunRecord[] = getInitialRouteRunHistory(
  routeRunHistoryStorageKey,
  maxRouteRunHistory
);

for (const route of benchmarkRoutes) {
  const button = document.createElement('button');
  button.className = 'route';
  button.type = 'button';
  button.innerHTML = `<strong>${route.name}</strong><span>${route.summary}</span>`;
  button.addEventListener('click', () => {
    activateBenchmarkRoute(route.id);
  });
  routeButtons.set(route.id, button);
  routeList.append(button);
}

focusSceneButton.addEventListener('click', () => activatePreset(firstPreset.id));
focusOverviewButton.addEventListener('click', () => activatePreset('hover'));
useViewerUiStore.subscribe((state) => {
  const { presetSelectionRequest, variantSelectionRequest } = state;

  if (presetSelectionRequest.sequence !== lastPresetSelectionSequence) {
    lastPresetSelectionSequence = presetSelectionRequest.sequence;
    const presetId = presetSelectionRequest.id;
    if (presetId) {
      activatePreset(presetId);
    }
  }

  if (variantSelectionRequest.sequence !== lastVariantSelectionSequence) {
    lastVariantSelectionSequence = variantSelectionRequest.sequence;
    const variantId = variantSelectionRequest.id;
    if (variantId) {
      void activateVariant(variantId);
    }
  }
});
runRouteCurrentVariantButton.addEventListener('click', () => {
  void runCurrentVariantRouteBenchmark();
});
runRouteSuiteButton.addEventListener('click', () => {
  void runRouteBenchmarkSuite();
});
copyRouteAnalysisSummaryButton.addEventListener('click', () => {
  void copyLatestRouteAnalysis('summary');
});
copyRouteAnalysisJsonButton.addEventListener('click', () => {
  void copyLatestRouteAnalysis('json');
});
downloadRouteAnalysisJsonButton.addEventListener('click', () => {
  downloadLatestRouteAnalysisJson();
});
renderScaleSlider.addEventListener('input', (event) => {
  const nextPercent = Number((event.currentTarget as HTMLInputElement).value);
  activateRenderScale(nextPercent);
});
for (const toggle of inspectorToggles) {
  toggle.addEventListener('click', () => {
    const { toggle: panelId } = toggle.dataset;
    if (!panelId) {
      return;
    }

    setOpenInspectorPanel(openInspectorPanel === panelId ? null : panelId);
  });
}

updatePresetButtons();
updateVariantButtons();
updateRouteButtons();
renderRouteBatchState();
renderVariantMeta(defaultVariant);
renderRenderScaleMeta(activeRenderScalePercent);
renderCameraMeta(null);
renderPerfHud(null);
publishRouteDiagnostics();
installRouteAnalysisBridge();
setOpenInspectorPanel(openInspectorPanel);

statusTitle.textContent = '加载中';
statusDetail.textContent = '准备场景资源';

await activateVariant(defaultVariant.id, true);

function renderVariantMeta(variant) {
  variantSize.textContent = variant.size;
  variantSplats.textContent = variant.splats;
  variantRetention.textContent = variant.retention;
  variantTitle.textContent = variant.name;
  variantNote.textContent = variant.note;
  publishVariantPanel();
  renderVariantBenchmark(variant.id);
}

function activateRenderScale(nextPercent) {
  const normalizedPercent = normalizeRenderScalePercent(nextPercent, maxRenderScalePercent);
  activeRenderScalePercent = normalizedPercent;
  renderScaleSlider.value = String(normalizedPercent);
  persistRenderScalePercent(window, normalizedPercent);
  renderRenderScaleMeta(normalizedPercent);
  applyRenderScaleToRuntime(runtime, normalizedPercent, maxRenderScalePercent);
  renderPerfHud(runtime);
}

function renderRenderScaleMeta(percent) {
  const pixelRatio = (percent / 100).toFixed(2);
  renderScaleValue.textContent = `${percent}% · x${pixelRatio}`;
  qualitySummary.textContent = `${percent}%`;
  renderScaleNote.textContent = percent >= 100
    ? '原生像素比'
    : '降低像素比，换取更稳帧率';
}

async function activateVariant(variantId, initial = false, forceReload = false) {
  const variant = variantsById.get(variantId);

  if (!variant) {
    return;
  }

  if (!initial && !forceReload && variantId === activeVariantId) {
    return;
  }

  if (activeRouteId) {
    stopActiveBenchmarkRoute('未播放', 'switch');
  }

  const loadToken = ++currentLoadToken;
  const switchStartedAt = performance.now();
  const preservedView = initial ? null : captureCurrentView(runtime);
  const benchmark = beginStoredVariantBenchmark(variantBenchmarks, variant.id);
  activeVariantId = variant.id;
  updateVariantButtons();
  renderVariantMeta(variant);
  setVariantButtonsDisabled(true);
  statusTitle.textContent = '切换中';
  statusDetail.textContent = `${variant.name}`;

  try {
    const nextRuntime = await mountRuntime(variant, { switchStartedAt, benchmark });
    if (loadToken !== currentLoadToken) {
      nextRuntime?.destroy?.();
      return;
    }

    runtime = nextRuntime;
    const restored = restoreCurrentView(runtime, preservedView);
    if (!restored) {
      activatePreset(activePresetId || 'hover', true);
    }
    statusTitle.textContent = '场景已就绪';
    statusDetail.textContent = `${variant.size} · ${variant.retention} 保留`;
  } catch (error) {
    statusTitle.textContent = '加载失败';
    statusDetail.textContent = error instanceof Error ? error.message : '未知错误';
    throw error;
  } finally {
    if (loadToken === currentLoadToken) {
      setVariantButtonsDisabled(false);
    }
  }
}

async function mountRuntime(variant, timings: any) {
  if (runtime) {
    await loadVariantIntoRuntime({
      pc,
      runtimeState: runtime,
      variant,
      timings,
      createBenchmark: () => beginStoredVariantBenchmark(variantBenchmarks, variant.id),
      publishVariantBenchmark,
      configureUnifiedGsplat,
      trackFirstFrame: (app, variantId, switchStartedAt) =>
        trackBenchmarkFirstFrame(
          app,
          variantId,
          switchStartedAt,
          getVariantBenchmark,
          publishVariantBenchmark
        )
    });
    return runtime;
  }

  sceneContainer.replaceChildren();
  const canvas = document.createElement('canvas');
  const rect = sceneContainer.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width));
  canvas.height = Math.max(1, Math.round(rect.height));
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  sceneContainer.append(canvas);
  return createRuntime(canvas, variant, timings);
}

function activatePreset(presetId, immediate = false) {
  const preset = data.presets.find((entry) => entry.id === presetId);
  if (!preset) {
    return;
  }

  if (activeRouteId) {
    stopActiveBenchmarkRoute('镜头接管', 'manual');
  }

  activePresetId = preset.id;
  presetsSummary.textContent = preset.name;
  updatePresetButtons();

  if (runtime) {
    moveCamera(runtime, preset, immediate);
  }
}

function activateBenchmarkRoute(routeId) {
  const route = benchmarkRoutesById.get(routeId);

  if (!route) {
    return;
  }

  selectedRouteId = route.id;
  if (activeRouteId === routeId) {
    stopActiveBenchmarkRoute();
    return;
  }

  activeRouteId = route.id;
  routeSummary.textContent = `${route.name} · 运行中`;
  updateRouteButtons();

  if (runtime) {
    startBenchmarkRoute(runtime, route);
  }
}

async function runRouteBenchmarkSuite() {
  const routeId = selectedRouteId ?? benchmarkRoutes[0]?.id;
  const route = routeId ? benchmarkRoutesById.get(routeId) : null;

  if (!route || isBatchBenchmarkRunning) {
    return;
  }

  isBatchBenchmarkRunning = true;
  renderRouteBatchState();
  setVariantButtonsDisabled(true);
  statusTitle.textContent = '标准测试中';

  try {
    activeSuiteRunId = `suite-${Date.now()}`;
    for (let index = 0; index < data.variants.length; index += 1) {
      const variant = data.variants[index];
      statusDetail.textContent = `${route.name} · ${index + 1}/${data.variants.length} · ${variant.name}`;
      await activateVariant(variant.id, false, true);
      await playBenchmarkRouteOnce(route.id);
    }

    statusTitle.textContent = '标准测试完成';
    statusDetail.textContent = `${route.name} · 已记录 ${data.variants.length} 个版本`;
  } catch (error) {
    statusTitle.textContent = '标准测试中断';
    statusDetail.textContent = error instanceof Error ? error.message : '未知错误';
    throw error;
  } finally {
    activeSuiteRunId = null;
    isBatchBenchmarkRunning = false;
    renderRouteBatchState();
    setVariantButtonsDisabled(false);
    updateRouteButtons();
  }
}

async function runCurrentVariantRouteBenchmark() {
  return runVariantRouteBenchmark({
    routeId: selectedRouteId ?? benchmarkRoutes[0]?.id,
    variantId: activeVariantId,
    repeatCount: currentVariantRepeatCount,
    suitePrefix: 'single'
  });
}

async function runVariantRouteBenchmark(options: any = {}) {
  const routeId = options.routeId ?? selectedRouteId ?? benchmarkRoutes[0]?.id;
  const route = routeId ? benchmarkRoutesById.get(routeId) : null;
  const variantId = options.variantId ?? activeVariantId;
  const variant = variantsById.get(variantId);
  const repeatCount = Number.isFinite(options.repeatCount)
    ? Math.max(1, Math.floor(options.repeatCount))
    : currentVariantRepeatCount;
  const suitePrefix = options.suitePrefix ?? 'single';

  if (!route || !variant || isBatchBenchmarkRunning) {
    return null;
  }

  activeBenchmarkRunPromise = (async () => {
    isBatchBenchmarkRunning = true;
    renderRouteBatchState();
    setVariantButtonsDisabled(true);
    statusTitle.textContent = '单版本测试中';

    try {
      activeSuiteRunId = `${suitePrefix}-${Date.now()}`;
      for (let index = 0; index < repeatCount; index += 1) {
        statusDetail.textContent = `${route.name} · ${variant.name} · 第 ${index + 1}/${repeatCount} 次`;
        await activateVariant(variant.id, false, true);
        await playBenchmarkRouteOnce(route.id);
      }
      statusTitle.textContent = '单版本测试完成';
      statusDetail.textContent = `${route.name} · ${variant.name} 已记录 ${repeatCount} 次`;
      return getLatestRouteAnalysisExport(routeRunHistory, Object.keys(frameSampleIndices));
    } catch (error) {
      statusTitle.textContent = '单版本测试中断';
      statusDetail.textContent = error instanceof Error ? error.message : '未知错误';
      throw error;
    } finally {
      activeSuiteRunId = null;
      isBatchBenchmarkRunning = false;
      activeBenchmarkRunPromise = null;
      renderRouteBatchState();
      setVariantButtonsDisabled(false);
      updateRouteButtons();
    }
  })();

  return activeBenchmarkRunPromise;
}

function playBenchmarkRouteOnce(routeId) {
  const route = benchmarkRoutesById.get(routeId);

  if (!runtime || !route) {
    return Promise.reject(new Error('缺少可运行的轨迹或运行时'));
  }

  return new Promise<void>((resolve, reject) => {
    selectedRouteId = route.id;
    activeRouteId = route.id;
    routeSummary.textContent = `${route.name} · 运行中`;
    updateRouteButtons();
    renderRouteBatchState();
    startBenchmarkRoute(runtime, route, {
      onFinish: (record: any) => {
        if (!record || record.status !== 'completed') {
          reject(new Error(`${route.name} 未完整跑完`));
          return;
        }

        resolve(record);
      }
    });
  });
}

function setOpenInspectorPanel(panelId) {
  openInspectorPanel = panelId;

  for (const toggle of inspectorToggles) {
    const isOpen = toggle.dataset.toggle === panelId;
    toggle.classList.toggle('is-active', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  }

  for (const [bodyId, body] of inspectorBodies) {
    body.classList.toggle('is-open', bodyId === panelId);
  }
}

function updatePresetButtons() {
  publishPresetPanel();
}

function updateVariantButtons() {
  publishVariantPanel();
}

function updateRouteButtons() {
  for (const [routeId, button] of routeButtons) {
    button.classList.toggle('is-active', routeId === selectedRouteId);
    button.classList.toggle('is-running', routeId === activeRouteId);
    button.disabled = isBatchBenchmarkRunning;
  }
}

function setVariantButtonsDisabled(disabled) {
  isVariantPanelDisabled = disabled;
  publishVariantPanel();
}

function publishVariantPanel() {
  const activeVariant = variantsById.get(activeVariantId) ?? defaultVariant;
  useViewerUiStore.getState().setVariantPanel({
    summary: activeVariant.name,
    items: data.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      meta: `${variant.size} · ${variant.retention}`,
      isActive: variant.id === activeVariantId,
      disabled: isVariantPanelDisabled
    }))
  });
}

function publishPresetPanel() {
  const activePreset = data.presets.find((preset) => preset.id === activePresetId) ?? firstPreset;
  useViewerUiStore.getState().setPresetPanel({
    summary: activePreset.name,
    items: data.presets.map((preset) => ({
      id: preset.id,
      name: preset.name,
      summary: preset.summary,
      isActive: preset.id === activePresetId
    }))
  });
}

function renderRouteBatchState() {
  if (!runRouteCurrentVariantButton || !runRouteSuiteButton || !routeBatchNote) {
    return;
  }

  const selectedRoute = selectedRouteId ? benchmarkRoutesById.get(selectedRouteId) : null;
  runRouteCurrentVariantButton.disabled = isBatchBenchmarkRunning || benchmarkRoutes.length === 0;
  runRouteSuiteButton.disabled = isBatchBenchmarkRunning || benchmarkRoutes.length === 0;
  runRouteCurrentVariantButton.textContent = isBatchBenchmarkRunning ? '测试运行中…' : `跑当前轨迹 × 当前版本 ×${currentVariantRepeatCount}`;
  runRouteSuiteButton.textContent = isBatchBenchmarkRunning ? '标准测试运行中…' : '跑当前轨迹 × 全版本';
  routeBatchNote.textContent = selectedRoute
    ? `${selectedRoute.name} · 当前版本或 ${data.variants.length} 个版本`
    : '先选择一条轨迹，再批量跑所有版本。';
}

async function createRuntime(canvasElement, variant, timings: any = {}) {
  const app = new pc.Application(canvasElement, {
    mouse: new pc.Mouse(canvasElement),
    touch: new pc.TouchDevice(canvasElement),
    graphicsDeviceOptions: {
      antialias: false,
      powerPreference: 'high-performance'
    }
  });

  const performanceMode = createPerformanceMode(window, activeRenderScalePercent);
  const loopController = createLoopController(app);
  app.graphicsDevice.maxPixelRatio = performanceMode.currentPixelRatio;
  app.scene.gammaCorrection = pc.GAMMA_SRGB;
  app.scene.toneMapping = pc.TONEMAP_ACES;
  app.scene.skyboxIntensity = 0.65;
  app.start();
  app.autoRender = true;
  app.renderNextFrame = true;

  const preventContextMenu = (event) => event.preventDefault();
  const resolveCanvasBounds = () => {
    const host = canvasElement.parentElement;
    const rect = host?.getBoundingClientRect();

    return {
      width: Math.max(1, Math.round(rect?.width || window.innerWidth || 1)),
      height: Math.max(1, Math.round(rect?.height || window.innerHeight || 1))
    };
  };
  const handleResize = () => {
    const { width, height } = resolveCanvasBounds();
    const deviceRatio = Math.min(app.graphicsDevice.maxPixelRatio || 1, window.devicePixelRatio || 1);
    loopController.wake();
    canvasElement.style.width = `${width}px`;
    canvasElement.style.height = `${height}px`;
    app.graphicsDevice.setResolution(
      Math.max(1, Math.floor(width * deviceRatio)),
      Math.max(1, Math.floor(height * deviceRatio))
    );
    app.renderNextFrame = true;
  };
  canvasElement.addEventListener('contextmenu', preventContextMenu);
  window.addEventListener('resize', handleResize);
  const resizeObserver = typeof ResizeObserver !== 'undefined' && canvasElement.parentElement
    ? new ResizeObserver(() => {
      handleResize();
    })
    : null;
  resizeObserver?.observe(canvasElement.parentElement);
  handleResize();
  window.requestAnimationFrame(() => {
    handleResize();
  });

  const camera = new pc.Entity('MemorialCamera');
  camera.addComponent('camera', {
    clearColor: new pc.Color(0.02, 0.04, 0.06),
    fov: 52,
    nearClip: 0.01,
    farClip: 64
  });
  app.root.addChild(camera);

  const initialTarget = vec3(firstPreset.target);
  const initialPosition = vec3(firstPreset.position);
  const orbit = createOrbitController(pc, camera, canvasElement, initialPosition, initialTarget, performanceMode);

  const runtimeState = {
    variantId: variant.id,
    app,
    canvasElement,
    orbit,
    benchmark: timings.benchmark ?? beginStoredVariantBenchmark(variantBenchmarks, variant.id),
    performanceMode,
    loopController,
    routePlayback: null,
    routeRecord: null,
    splatAsset: null,
    splatEntity: null,
    variantMeta: variant,
    unifiedLodState: null,
    lastCameraSnapshot: '',
    cameraMetaElapsed: 0,
    perfHudElapsed: 0,
    perfHudFrames: 0,
    renderWakeRemaining: renderWakeSeconds,
    requestRender: () => {
      loopController.wake();
      runtimeState.renderWakeRemaining = renderWakeSeconds;
      app.autoRender = true;
      app.renderNextFrame = true;
    },
    destroy: () => {
      loopController.wake();
      detachVariantFromRuntime(runtimeState);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      canvasElement.removeEventListener('contextmenu', preventContextMenu);
      orbit.destroy();
      app.destroy();
    }
  };

  orbit.onManualInput = () => {
    if (activeRouteId) {
      stopActiveBenchmarkRoute('手动接管', 'manual');
    }
    runtimeState.requestRender();
  };

  const suspendRuntime = () => {
    runtimeState.renderWakeRemaining = 0;
    runtimeState.orbit.cancelInteraction?.();
    app.autoRender = false;
    app.renderNextFrame = false;
    loopController.sleep();
  };

  const resumeRuntime = () => {
    runtimeState.requestRender();
    renderCameraMeta(runtimeState);
    renderPerfHud(runtimeState);
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      suspendRuntime();
      return;
    }

    resumeRuntime();
  };

  const handleWindowBlur = () => {
    runtimeState.orbit.cancelInteraction?.();
  };

  const handleWindowFocus = () => {
    if (!document.hidden) {
      resumeRuntime();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleWindowBlur);
  window.addEventListener('focus', handleWindowFocus);

  const handleUpdate = (dt) => {
    const routeChanged = updateBenchmarkRoute(runtimeState, dt);
    const orbitChanged = updateOrbitController(runtimeState.orbit, dt, pc);
    const performanceChanged = updatePerformanceMode(runtimeState.performanceMode, app, dt);
    const isMoving = routeChanged || orbitChanged || runtimeState.performanceMode.isInteracting;
    const unifiedLodChanged = updateUnifiedLodWarmup(runtimeState, dt, isMoving);
    const hasActiveRoutePlayback = Boolean(runtimeState.routePlayback);
    if (runtimeState.routeRecord && hasActiveRoutePlayback) {
      recordBenchmarkRouteFrame({
        orbit: runtimeState.orbit,
        routeRecord: runtimeState.routeRecord,
        stepIndex: runtimeState.routePlayback.stepIndex,
        dt
      });
    }
    const keepRendering = hasActiveRoutePlayback || isMoving || performanceChanged || isUnifiedLodWarmupActive(runtimeState);
    if (isMoving) {
      sampleMotionFrame(runtimeState.benchmark, dt);
    } else if (endMotionSession(runtimeState.benchmark)) {
      publishVariantBenchmark(runtimeState.variantId);
    }
    if (keepRendering) {
      runtimeState.requestRender();
    } else if (runtimeState.renderWakeRemaining > 0) {
      runtimeState.renderWakeRemaining = Math.max(0, runtimeState.renderWakeRemaining - dt);
      if (runtimeState.renderWakeRemaining === 0) {
        app.autoRender = false;
        loopController.sleep();
      }
    }
    runtimeState.cameraMetaElapsed += dt;
    if (runtimeState.cameraMetaElapsed >= cameraMetaIntervalSeconds) {
      renderCameraMeta(runtimeState);
      runtimeState.cameraMetaElapsed = 0;
    }
    runtimeState.perfHudElapsed += dt;
    runtimeState.perfHudFrames += 1;
    if (runtimeState.perfHudElapsed >= perfHudIntervalSeconds) {
      renderPerfHud(runtimeState);
      runtimeState.perfHudElapsed = 0;
      runtimeState.perfHudFrames = 0;
    }

    if (unifiedLodChanged) {
      runtimeState.requestRender();
    }
  };
  app.on('update', handleUpdate);
  const destroyRuntime = runtimeState.destroy;
  runtimeState.destroy = () => {
    app.off('update', handleUpdate);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('focus', handleWindowFocus);
    destroyRuntime();
  };

  await loadVariantIntoRuntime({
    pc,
    runtimeState,
    variant,
    timings,
    createBenchmark: () => beginStoredVariantBenchmark(variantBenchmarks, variant.id),
    publishVariantBenchmark,
    configureUnifiedGsplat,
    trackFirstFrame: (app, variantId, switchStartedAt) =>
      trackBenchmarkFirstFrame(
        app,
        variantId,
        switchStartedAt,
        getVariantBenchmark,
        publishVariantBenchmark
      )
  });
  return runtimeState;
}

function moveCamera(runtimeState, preset, immediate = false) {
  setOrbitPreset(runtimeState.orbit, vec3(preset.position), vec3(preset.target), immediate, pc);
  runtimeState.requestRender();
}

function startBenchmarkRoute(runtimeState, route, options: any = {}) {
  if (!runtimeState || !route?.steps?.length) {
    return;
  }

  beginMotionSession(runtimeState.benchmark);
  publishVariantBenchmark(runtimeState.variantId);
  runtimeState.routeRecord = createBenchmarkRouteRunRecord({
    route,
    variantId: runtimeState.variantId,
    variantName: runtimeState.variantMeta?.name ?? runtimeState.variantId,
    suiteId: activeSuiteRunId,
    renderScalePercent: activeRenderScalePercent,
    longTaskStartIndex: longTaskBuffer.length,
    resourceStartIndex: performance.getEntriesByType('resource').length
  });
  runtimeState.routePlayback = {
    route,
    onFinish: options.onFinish ?? null,
    stepIndex: -1,
    stepRemaining: 0
  };
  advanceBenchmarkRoute(runtimeState);
}

function stopBenchmarkRoute(runtimeState, status = 'aborted') {
  if (!runtimeState) {
    return;
  }

  const playback = runtimeState.routePlayback;
  const finalizedRecord = finalizeRouteRunRecord(runtimeState, status);
  runtimeState.routePlayback = null;
  playback?.onFinish?.(finalizedRecord);
}

function stopActiveBenchmarkRoute(summaryText = '未播放', status = 'aborted') {
  if (runtime) {
    stopBenchmarkRoute(runtime, status);
  }

  activeRouteId = null;
  routeSummary.textContent = summaryText;
  updateRouteButtons();
}

function advanceBenchmarkRoute(runtimeState) {
  const playback = runtimeState?.routePlayback;

  if (!playback) {
    return false;
  }

  playback.stepIndex += 1;
  if (playback.stepIndex >= playback.route.steps.length) {
    if (activeRouteId === playback.route.id) {
      stopActiveBenchmarkRoute(`${playback.route.name} · 完成`, 'completed');
    } else {
      stopBenchmarkRoute(runtimeState, 'completed');
    }
    return false;
  }

  const step = playback.route.steps[playback.stepIndex];
  const duration = Number.isFinite(step.duration) ? Math.max(step.duration, 0) : 1.35;
  const hold = Number.isFinite(step.hold) ? Math.max(step.hold, 0) : 0.35;
  const immediate = duration === 0;
  setOrbitPreset(runtimeState.orbit, vec3(step.position), vec3(step.target), immediate, pc, duration);
  playback.stepRemaining = duration + hold;
  runtimeState.requestRender?.();

  if (activeRouteId === playback.route.id) {
    routeSummary.textContent = `${playback.route.name} · ${playback.stepIndex + 1}/${playback.route.steps.length}`;
  }

  return true;
}

function updateBenchmarkRoute(runtimeState, dt) {
  const playback = runtimeState?.routePlayback;

  if (!playback) {
    return false;
  }

  playback.stepRemaining -= dt;
  if (playback.stepRemaining > 0) {
    return false;
  }

  return advanceBenchmarkRoute(runtimeState);
}

function captureCurrentView(runtimeState) {
  return captureOrbitView(runtimeState?.orbit);
}

function restoreCurrentView(runtimeState, snapshot) {
  if (!restoreOrbitView(runtimeState?.orbit, snapshot, pc)) {
    return false;
  }
  runtimeState.requestRender?.();
  return true;
}

function configureUnifiedGsplat(app, variant) {
  if (!variant?.unified || !variant.unifiedTuning || !app?.scene?.gsplat) {
    return null;
  }

  const baseProfile = normalizeUnifiedGsplatProfile(variant.unifiedTuning);
  applyUnifiedGsplatProfile(app.scene.gsplat, baseProfile);

  return {
    mode: 'base',
    baseProfile,
    warmSecondsRemaining: 0,
    riskSnapshot: null
  };
}

function normalizeUnifiedGsplatProfile(profile) {
  return {
    lodUnderfillLimit: Number.isFinite(profile?.lodUnderfillLimit) ? profile.lodUnderfillLimit : undefined,
    cooldownTicks: Number.isFinite(profile?.cooldownTicks) ? profile.cooldownTicks : undefined,
    lodUpdateDistance: Number.isFinite(profile?.lodUpdateDistance) ? profile.lodUpdateDistance : undefined,
    lodUpdateAngle: Number.isFinite(profile?.lodUpdateAngle) ? profile.lodUpdateAngle : undefined,
    lodBehindPenalty: Number.isFinite(profile?.lodBehindPenalty) ? profile.lodBehindPenalty : undefined
  };
}

function applyUnifiedGsplatProfile(sceneGsplat, profile) {
  if (!sceneGsplat || !profile) {
    return false;
  }

  let changed = false;
  for (const [key, value] of Object.entries(profile)) {
    if (!Number.isFinite(value) || sceneGsplat[key] === value) {
      continue;
    }

    sceneGsplat[key] = value;
    changed = true;
  }

  return changed;
}

function updateUnifiedLodWarmup(runtimeState, dt, isMoving) {
  const state = runtimeState?.unifiedLodState;
  const orbit = runtimeState?.orbit;

  if (!state || !orbit) {
    return false;
  }

  const riskSnapshot = getUnifiedLodRiskSnapshot(orbit);
  state.riskSnapshot = riskSnapshot;

  if (riskSnapshot.shouldPrewarm) {
    const refillSeconds = isMoving ? lowAnglePrewarmLeadSeconds : lowAnglePrewarmHoldSeconds;
    state.warmSecondsRemaining = Math.min(
      lowAnglePrewarmMaxSeconds,
      Math.max(state.warmSecondsRemaining, refillSeconds)
    );
  }
  const nextMode = state.warmSecondsRemaining > 0 ? 'warmup' : 'base';
  const modeChanged = state.mode !== nextMode;

  if (modeChanged) {
    state.mode = nextMode;
    if (runtimeState.routeRecord) {
      runtimeState.routeRecord.lodWarmups.push({
        elapsedMs: roundNumber(performance.now() - runtimeState.routeRecord.startedPerfTime),
        mode: nextMode,
        pitch: riskSnapshot.pitchDeg,
        distance: riskSnapshot.distance,
        score: riskSnapshot.score
      });
    }
  }

  if (state.warmSecondsRemaining > 0) {
    state.warmSecondsRemaining = Math.max(0, state.warmSecondsRemaining - dt);
  }

  return modeChanged;
}

function isUnifiedLodWarmupActive(runtimeState) {
  return (runtimeState?.unifiedLodState?.warmSecondsRemaining ?? 0) > 0;
}

function getUnifiedLodRiskSnapshot(orbit) {
  const pitchDeg = Math.abs(Math.round(radToDeg(orbit.currentPitch)));
  const distance = roundNumber(orbit.currentDistance, 3);
  const pitchScore = clamp((lowAnglePrewarmPitchThresholdDeg - pitchDeg) / lowAnglePrewarmPitchThresholdDeg, 0, 1);
  const distanceScore = clamp((lowAnglePrewarmDistanceThreshold - distance) / lowAnglePrewarmDistanceThreshold, 0, 1);
  const score = roundNumber(pitchScore * 0.7 + distanceScore * 0.3, 2);

  return {
    pitchDeg,
    distance,
    score,
    shouldPrewarm: pitchDeg <= lowAnglePrewarmPitchThresholdDeg && distance <= lowAnglePrewarmDistanceThreshold
  };
}

function finalizeRouteRunRecord(runtimeState, status) {
  const record = runtimeState?.routeRecord;
  if (!record) {
    return null;
  }

  const finalizedRecord = finalizeBenchmarkRouteRunRecord({
    record,
    benchmark: runtimeState.benchmark,
    status,
    longTaskBuffer,
    getRouteStepLabel
  });

  routeRunHistory.unshift(finalizedRecord);
  routeRunHistory.length = Math.min(routeRunHistory.length, maxRouteRunHistory);
  persistRouteRunHistory(routeRunHistoryStorageKey, routeRunHistory);
  publishRouteDiagnostics();
  runtimeState.routeRecord = null;
  return finalizedRecord;
}

function getRouteStepLabel(routeId, stepIndex) {
  const route = routeId ? benchmarkRoutesById.get(routeId) : null;
  const totalSteps = route?.steps?.length ?? null;
  const ordinal = Number.isFinite(stepIndex) ? stepIndex + 1 : 0;
  return totalSteps
    ? `Step ${ordinal}/${totalSteps}`
    : `Step ${ordinal}`;
}

function buildRouteDiagnosticsState(): RouteDiagnosticsViewState {
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

function publishRouteDiagnostics() {
  useViewerUiStore.getState().setRouteDiagnostics(buildRouteDiagnosticsState());
}

async function copyLatestRouteAnalysis(mode) {
  const exportPayload = getLatestRouteAnalysisExport(routeRunHistory, Object.keys(frameSampleIndices));
  if (!exportPayload) {
    setRouteAnalysisCopyNote('还没有可导出的标准测试结果。');
    return;
  }

  const textPayload = mode === 'json'
    ? JSON.stringify(exportPayload, null, 2)
    : formatRouteAnalysisSummaryText(exportPayload.summary, exportPayload.records);

  try {
    await navigator.clipboard.writeText(textPayload);
    setRouteAnalysisCopyNote(mode === 'json' ? '已复制 JSON。' : '已复制摘要。');
  } catch {
    setRouteAnalysisCopyNote('复制失败，可能是浏览器权限限制。');
  }
}

function downloadLatestRouteAnalysisJson() {
  const exportPayload = getLatestRouteAnalysisExport(routeRunHistory, Object.keys(frameSampleIndices));
  if (!exportPayload) {
    setRouteAnalysisCopyNote('还没有可导出的标准测试结果。');
    return;
  }

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const routeSlug = exportPayload.summary.routeName.replace(/[^\p{Letter}\p{Number}-]+/gu, '-').replace(/-+/g, '-');
  const link = document.createElement('a');
  link.href = url;
  link.download = `ruoshui-route-analysis-${routeSlug}-${exportPayload.summary.suiteId}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  setRouteAnalysisCopyNote('已下载 JSON。');
}

function setRouteAnalysisCopyNote(text) {
  routeAnalysisCopyNoteOverride = text;
  publishRouteDiagnostics();
  if (routeAnalysisCopyTimeoutId) {
    window.clearTimeout(routeAnalysisCopyTimeoutId);
  }

  routeAnalysisCopyTimeoutId = window.setTimeout(() => {
    routeAnalysisCopyNoteOverride = null;
    publishRouteDiagnostics();
    routeAnalysisCopyTimeoutId = null;
  }, routeAnalysisCopyFeedbackMs);
}

function installRouteAnalysisBridge() {
  window.__ruoshuiPerf = {
    latest() {
      return getLatestRouteAnalysisExport(routeRunHistory, Object.keys(frameSampleIndices));
    },
    history() {
      return routeRunHistory;
    },
    copySummary() {
      return copyLatestRouteAnalysis('summary');
    },
    copyJson() {
      return copyLatestRouteAnalysis('json');
    },
    clearHistory() {
      routeRunHistory.length = 0;
      persistRouteRunHistory(routeRunHistoryStorageKey, routeRunHistory);
      publishRouteDiagnostics();
    },
    variants() {
      return data.variants.map((variant) => ({ id: variant.id, name: variant.name }));
    },
    routes() {
      return benchmarkRoutes.map((route) => ({ id: route.id, name: route.name }));
    },
    async runVariantRoute(options: any = {}) {
      if (options.clearHistory) {
        this.clearHistory();
      }

      return runVariantRouteBenchmark({
        routeId: options.routeId,
        variantId: options.variantId,
        repeatCount: options.repeatCount,
        suitePrefix: options.suitePrefix ?? 'single'
      });
    },
    async waitForIdle() {
      if (!activeBenchmarkRunPromise) {
        return null;
      }

      return activeBenchmarkRunPromise;
    }
  };
}

function getVariantBenchmark(variantId: string | null | undefined): VariantBenchmark | null {
  return getStoredVariantBenchmark(variantBenchmarks, variantId);
}

function publishVariantBenchmark(variantId) {
  if (variantId === activeVariantId) {
    renderVariantBenchmark(variantId);
  }
}

function renderVariantBenchmark(variantId) {
  const benchmark = getVariantBenchmark(variantId);
  metricLoad.textContent = formatMetricMs(benchmark?.loadMs);
  metricFirstFrame.textContent = formatMetricMs(benchmark?.firstFrameMs);
  metricMotion.textContent = formatMotionMetric(benchmark);
}


function vec3(tuple) {
  return new pc.Vec3(tuple[0], tuple[1], tuple[2]);
}

function buildCameraState(runtimeState): CameraViewState | null {
  if (!runtimeState?.orbit) {
    return {
      summary: '等待视角',
      position: '—',
      target: '—',
      distance: '—',
      angle: '—'
    };
  }

  const { orbit } = runtimeState;
  const position = orbit.camera.getPosition();
  const target = orbit.currentTarget;
  const distance = orbit.currentDistance;
  const pitch = Math.round(radToDeg(orbit.currentPitch));
  const yaw = Math.round(radToDeg(orbit.currentYaw));
  const snapshot = [
    position.x.toFixed(2),
    position.y.toFixed(2),
    position.z.toFixed(2),
    target.x.toFixed(2),
    target.y.toFixed(2),
    target.z.toFixed(2),
    distance.toFixed(2),
    pitch,
    yaw
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
    angle: `${pitch}° / ${yaw}°`
  };
}

function renderCameraMeta(runtimeState) {
  const state = buildCameraState(runtimeState);
  if (!state) {
    return;
  }

  useViewerUiStore.getState().setCamera(state);
}

function renderPerfHud(runtimeState) {
  if (!showPerfHud || !perfFps || !perfMs || !perfRender || !perfScale) {
    return;
  }

  perfScale.textContent = `${activeRenderScalePercent}%`;

  if (!runtimeState?.app || !runtimeState?.performanceMode) {
    perfFps.textContent = '—';
    perfMs.textContent = '—';
    perfRender.textContent = '未加载';
    return;
  }

  const sampleTime = runtimeState.perfHudElapsed;
  const frameCount = runtimeState.perfHudFrames;
  if (sampleTime > 0 && frameCount > 0) {
    const fps = frameCount / sampleTime;
    const ms = (sampleTime / frameCount) * 1000;
    perfFps.textContent = `${Math.round(fps)}`;
    perfMs.textContent = `${ms.toFixed(1)} ms`;
  }

  const isRendering = runtimeState.app.autoRender || runtimeState.performanceMode.isInteracting;
  perfRender.textContent = isRendering ? '活动' : '静止';
  renderVariantBenchmark(activeVariantId);
}
