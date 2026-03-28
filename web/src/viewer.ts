import {
  currentVariantRepeatCount,
  frameSampleIndices,
  maxRouteRunHistory,
  renderWakeSeconds,
  routeAnalysisCopyFeedbackMs,
  routeRunHistoryStorageKey
} from './config';
import { getInitialRouteRunHistory } from './benchmark/history';
import { createRouteDiagnosticsController } from './benchmark/diagnostics-controller';
import { createRouteBenchmarkController } from './benchmark/route-benchmark-controller';
import {
  beginStoredVariantBenchmark,
  getStoredVariantBenchmark,
  initLongTaskObserver,
  trackBenchmarkFirstFrame
} from './benchmark/runtime';
import {
  advanceRuntimeBenchmarkRoute as advanceBenchmarkPlaybackRoute,
  captureRuntimeView,
  moveRuntimeCamera,
  restoreRuntimeView,
  startRuntimeBenchmarkRoute,
  stopRuntimeBenchmarkRoute as stopBenchmarkPlaybackRoute,
  updateRuntimeBenchmarkRoute as updateBenchmarkPlaybackRoute
} from './benchmark/playback';
import { applyRenderScaleToRuntime, getInitialRenderScalePercent, getMaxSupportedPixelRatio, normalizeRenderScalePercent, persistRenderScalePercent } from './performance/render-scale';
import { bindRuntimeViewport, bindRuntimeVisibility, createRuntimeApp } from './runtime/bootstrap';
import { createOrbitController } from './runtime/orbit';
import { createRuntimeUpdateHandler } from './runtime/update-loop';
import { detachVariantFromRuntime, loadVariantIntoRuntime } from './runtime/variant-loader';
import type { RouteRunRecord, VariantBenchmark, ViewerContent } from './types';
import { useViewerUiStore } from './ui/viewer-ui-store';
import {
  syncCameraState,
  syncPresetPanelState,
  syncRouteControlsState,
  syncVariantPanelState
} from './ui/viewer-ui-sync';
import { requireElement } from './utils/dom';
import { formatMetricMs, formatMotionMetric } from './utils/format';

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
let activeBenchmarkRunPromise: Promise<any> | null = null;
let isVariantPanelDisabled = false;
let lastVariantSelectionSequence = useViewerUiStore.getState().variantSelectionRequest.sequence;
let lastPresetSelectionSequence = useViewerUiStore.getState().presetSelectionRequest.sequence;
let lastRouteSelectionSequence = useViewerUiStore.getState().routeSelectionRequest.sequence;
let lastRunCurrentRouteBenchmarkRequest = useViewerUiStore.getState().runCurrentRouteBenchmarkRequest;
let lastRunRouteSuiteRequest = useViewerUiStore.getState().runRouteSuiteRequest;
let routeSummaryText = '未播放';
const variantBenchmarks = new Map<string, VariantBenchmark>();
const routeRunHistory: RouteRunRecord[] = getInitialRouteRunHistory(
  routeRunHistoryStorageKey,
  maxRouteRunHistory
);
const routeDiagnosticsController = createRouteDiagnosticsController({
  frameSchema: Object.keys(frameSampleIndices),
  copyFeedbackMs: routeAnalysisCopyFeedbackMs,
  maxRouteRunHistory,
  routeRunHistoryStorageKey,
  routeRunHistory,
  longTaskBuffer,
  benchmarkRoutes,
  variants: data.variants,
  getRouteStepLabel: (routeId, stepIndex) => {
    const route = routeId ? benchmarkRoutesById.get(routeId) : null;
    const totalSteps = route?.steps?.length ?? null;
    const ordinal = Number.isFinite(stepIndex) ? stepIndex + 1 : 0;
    return totalSteps ? `Step ${ordinal}/${totalSteps}` : `Step ${ordinal}`;
  },
  getActiveBenchmarkRunPromise: () => activeBenchmarkRunPromise,
  runVariantRouteBenchmark: (options) => runVariantRouteBenchmark(options)
});
const routeBenchmarkController = createRouteBenchmarkController({
  benchmarkRoutes,
  benchmarkRoutesById,
  variants: data.variants,
  variantsById,
  currentVariantRepeatCount,
  frameSchema: Object.keys(frameSampleIndices),
  routeRunHistory,
  getRuntime: () => runtime,
  getSelectedRouteId: () => selectedRouteId,
  setSelectedRouteId: (routeId) => {
    selectedRouteId = routeId;
  },
  getActiveRouteId: () => activeRouteId,
  setActiveRouteId: (routeId) => {
    activeRouteId = routeId;
  },
  getActiveVariantId: () => activeVariantId,
  getIsBatchBenchmarkRunning: () => isBatchBenchmarkRunning,
  setIsBatchBenchmarkRunning: (isRunning) => {
    isBatchBenchmarkRunning = isRunning;
  },
  setActiveSuiteRunId: (suiteId) => {
    activeSuiteRunId = suiteId;
  },
  setActiveBenchmarkRunPromise: (promise) => {
    activeBenchmarkRunPromise = promise;
  },
  setRouteSummaryText: (summaryText) => {
    routeSummaryText = summaryText;
  },
  setStatus: (title, detail) => {
    statusTitle.textContent = title;
    statusDetail.textContent = detail;
  },
  publishRouteControls,
  updateRouteButtons,
  setVariantButtonsDisabled,
  activateVariant,
  startBenchmarkRoute,
  stopActiveBenchmarkRoute
});

focusSceneButton.addEventListener('click', () => activatePreset(firstPreset.id));
focusOverviewButton.addEventListener('click', () => activatePreset('hover'));
useViewerUiStore.subscribe((state) => {
  const {
    presetSelectionRequest,
    variantSelectionRequest,
    routeSelectionRequest,
    runCurrentRouteBenchmarkRequest,
    runRouteSuiteRequest
  } = state;

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

  if (routeSelectionRequest.sequence !== lastRouteSelectionSequence) {
    lastRouteSelectionSequence = routeSelectionRequest.sequence;
    const routeId = routeSelectionRequest.id;
    if (routeId) {
      activateBenchmarkRoute(routeId);
    }
  }

  if (runCurrentRouteBenchmarkRequest !== lastRunCurrentRouteBenchmarkRequest) {
    lastRunCurrentRouteBenchmarkRequest = runCurrentRouteBenchmarkRequest;
    void runCurrentVariantRouteBenchmark();
  }

  if (runRouteSuiteRequest !== lastRunRouteSuiteRequest) {
    lastRunRouteSuiteRequest = runRouteSuiteRequest;
    void runRouteBenchmarkSuite();
  }
});
copyRouteAnalysisSummaryButton.addEventListener('click', () => {
  void routeDiagnosticsController.copyLatestRouteAnalysis('summary');
});
copyRouteAnalysisJsonButton.addEventListener('click', () => {
  void routeDiagnosticsController.copyLatestRouteAnalysis('json');
});
downloadRouteAnalysisJsonButton.addEventListener('click', () => {
  routeDiagnosticsController.downloadLatestRouteAnalysisJson();
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
publishRouteControls();
renderVariantMeta(defaultVariant);
renderRenderScaleMeta(activeRenderScalePercent);
renderCameraMeta(null);
renderPerfHud(null);
routeDiagnosticsController.publishRouteDiagnostics();
routeDiagnosticsController.installRouteAnalysisBridge();
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
  routeBenchmarkController.activateBenchmarkRoute(routeId);
}

async function runRouteBenchmarkSuite() {
  return routeBenchmarkController.runRouteBenchmarkSuite();
}

async function runCurrentVariantRouteBenchmark() {
  return routeBenchmarkController.runCurrentVariantRouteBenchmark();
}

async function runVariantRouteBenchmark(options: any = {}) {
  return routeBenchmarkController.runVariantRouteBenchmark(options);
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
  publishRouteControls();
}

function setVariantButtonsDisabled(disabled) {
  isVariantPanelDisabled = disabled;
  publishVariantPanel();
}

function publishVariantPanel() {
  syncVariantPanelState({
    variants: data.variants,
    activeVariantId,
    defaultVariant,
    disabled: isVariantPanelDisabled
  });
}

function publishPresetPanel() {
  syncPresetPanelState({
    presets: data.presets,
    activePresetId,
    firstPreset
  });
}

function publishRouteControls() {
  syncRouteControlsState({
    benchmarkRoutes,
    selectedRouteId,
    activeRouteId,
    routeSummaryText,
    variantCount: data.variants.length,
    isBatchBenchmarkRunning,
    currentVariantRepeatCount
  });
}

async function createRuntime(canvasElement, variant, timings: any = {}) {
  const { app, performanceMode, loopController } = createRuntimeApp({
    pc,
    canvasElement,
    runtimeWindow: window,
    renderScalePercent: activeRenderScalePercent
  });
  const viewportBinding = bindRuntimeViewport({
    app,
    canvasElement,
    loopController,
    runtimeWindow: window
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
      viewportBinding.destroy();
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

  const visibilityBinding = bindRuntimeVisibility({
    app,
    loopController,
    runtimeDocument: document,
    runtimeWindow: window,
    runtimeState,
    onResume: () => {
      renderCameraMeta(runtimeState);
      renderPerfHud(runtimeState);
    }
  });

  const handleUpdate = createRuntimeUpdateHandler({
    pc,
    runtimeState,
    updateBenchmarkRoute,
    publishVariantBenchmark,
    renderCameraMeta,
    renderPerfHud
  });
  app.on('update', handleUpdate);
  const destroyRuntime = runtimeState.destroy;
  runtimeState.destroy = () => {
    app.off('update', handleUpdate);
    visibilityBinding.destroy();
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
  moveRuntimeCamera({
    runtimeState,
    preset,
    immediate,
    pc,
    vec3
  });
}

function startBenchmarkRoute(runtimeState, route, options: any = {}) {
  startRuntimeBenchmarkRoute({
    runtimeState,
    route,
    suiteId: activeSuiteRunId,
    renderScalePercent: activeRenderScalePercent,
    longTaskBuffer,
    onFinish: options.onFinish ?? null
  });
  publishVariantBenchmark(runtimeState?.variantId);
  advanceBenchmarkRoute(runtimeState);
}

function stopBenchmarkRoute(runtimeState, status = 'aborted') {
  stopBenchmarkPlaybackRoute({
    runtimeState,
    status,
    finalizeRouteRunRecord
  });
}

function stopActiveBenchmarkRoute(summaryText = '未播放', status = 'aborted') {
  if (runtime) {
    stopBenchmarkRoute(runtime, status);
  }

  activeRouteId = null;
  routeSummaryText = summaryText;
  updateRouteButtons();
}

function advanceBenchmarkRoute(runtimeState) {
  return advanceBenchmarkPlaybackRoute({
    runtimeState,
    pc,
    vec3,
    activeRouteId,
    onActiveRouteCompleted: stopActiveBenchmarkRoute,
    stopRuntimeBenchmarkRoute: stopBenchmarkRoute,
    updateRouteSummary: (summaryText) => {
      routeSummaryText = summaryText;
      publishRouteControls();
    }
  });
}

function updateBenchmarkRoute(runtimeState, dt) {
  return updateBenchmarkPlaybackRoute({
    runtimeState,
    dt,
    advanceRuntimeBenchmarkRoute: () => advanceBenchmarkRoute(runtimeState)
  });
}

function captureCurrentView(runtimeState) {
  return captureRuntimeView(runtimeState);
}

function restoreCurrentView(runtimeState, snapshot) {
  return restoreRuntimeView({
    runtimeState,
    snapshot,
    pc
  });
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

function finalizeRouteRunRecord(runtimeState, status) {
  return routeDiagnosticsController.finalizeRouteRunRecord(runtimeState, status);
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

function renderCameraMeta(runtimeState) {
  syncCameraState(runtimeState);
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
