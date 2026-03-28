import {
  cameraMetaIntervalSeconds,
  currentVariantRepeatCount,
  frameSampleIndices,
  lowAnglePrewarmDistanceThreshold,
  lowAnglePrewarmHoldSeconds,
  lowAnglePrewarmLeadSeconds,
  lowAnglePrewarmMaxSeconds,
  lowAnglePrewarmPitchThresholdDeg,
  maxOrbitPitchDeg,
  maxRouteRunHistory,
  minOrbitPitchDeg,
  perfHudIntervalSeconds,
  renderWakeSeconds,
  routeAnalysisCopyFeedbackMs,
  routeRunHistoryStorageKey
} from './config';
import { analyzeRouteRun, formatHotspotResourceSummary, formatWorstStepLabel, getWorstStep, isTrackedModelResource, simplifyResourceName } from './benchmark/analysis';
import { applyRenderScaleToRuntime, createPerformanceMode, getInitialRenderScalePercent, getMaxSupportedPixelRatio, normalizeRenderScalePercent, persistRenderScalePercent, updatePerformanceMode } from './performance/render-scale';
import type { BenchmarkRoute, RouteRunRecord, VariantBenchmark, ViewerContent } from './types';
import { requireElement } from './utils/dom';
import { formatMetricMs, formatMetricPeakMs, formatMetricText, formatMotionMetric, formatRouteRunStatus, formatRouteRunTime, formatVec3 } from './utils/format';
import { clamp, degToRad, easeInOutCubic, lerp, lerpAngle, radToDeg, roundNumber } from './utils/math';

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

initLongTaskObserver();

const sceneContainer = requireElement<HTMLDivElement>('#scene');
const variantList = requireElement<HTMLDivElement>('#variant-list');
const routeList = requireElement<HTMLDivElement>('#route-list');
const routeLogList = requireElement<HTMLDivElement>('#route-log-list');
const routeAnalysisRanking = requireElement<HTMLDivElement>('#route-analysis-ranking');
const routeAnalysisHotspots = requireElement<HTMLDivElement>('#route-analysis-hotspots');
const presetList = requireElement<HTMLDivElement>('#preset-list');
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
const variantsSummary = requireElement<HTMLElement>('#variants-summary');
const qualitySummary = requireElement<HTMLElement>('#quality-summary');
const presetsSummary = requireElement<HTMLElement>('#presets-summary');
const routeSummary = requireElement<HTMLElement>('#route-summary');
const routeLogSummary = requireElement<HTMLElement>('#route-log-summary');
const routeAnalysisSummary = requireElement<HTMLElement>('#route-analysis-summary');
const routeAnalysisCopyNote = requireElement<HTMLElement>('#route-analysis-copy-note');
const cameraSummary = requireElement<HTMLElement>('#camera-summary');
const cameraPosition = requireElement<HTMLElement>('#camera-position');
const cameraTarget = requireElement<HTMLElement>('#camera-target');
const cameraDistance = requireElement<HTMLElement>('#camera-distance');
const cameraAngle = requireElement<HTMLElement>('#camera-angle');
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
let activeBenchmarkRunPromise: Promise<any> | null = null;

const variantButtons = new Map();
const routeButtons = new Map();
const presetButtons = new Map();
const variantBenchmarks = new Map<string, VariantBenchmark>();
const routeRunHistory: RouteRunRecord[] = getInitialRouteRunHistory();

for (const variant of data.variants) {
  const button = document.createElement('button');
  button.className = 'variant';
  button.type = 'button';
  button.innerHTML = `
    <span class="variant-line">
      <strong>${variant.name}</strong>
      <small>${variant.size} · ${variant.retention}</small>
    </span>
  `;
  button.addEventListener('click', () => {
    void activateVariant(variant.id);
  });
  variantButtons.set(variant.id, button);
  variantList.append(button);
}

for (const preset of data.presets) {
  const button = document.createElement('button');
  button.className = 'preset';
  button.type = 'button';
  button.innerHTML = `<strong>${preset.name}</strong><span>${preset.summary}</span>`;
  button.addEventListener('click', () => {
    activatePreset(preset.id);
  });
  presetButtons.set(preset.id, button);
  presetList.append(button);
}

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
renderRouteRunHistory();
renderRouteAnalysis();
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
  variantsSummary.textContent = variant.name;
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
  const benchmark = beginVariantBenchmark(variant.id);
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
    await loadVariantIntoRuntime(runtime, variant, timings);
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
      return getLatestRouteAnalysisExport();
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
  for (const [presetId, button] of presetButtons) {
    button.classList.toggle('is-active', presetId === activePresetId);
  }
}

function updateVariantButtons() {
  for (const [variantId, button] of variantButtons) {
    button.classList.toggle('is-active', variantId === activeVariantId);
  }
}

function updateRouteButtons() {
  for (const [routeId, button] of routeButtons) {
    button.classList.toggle('is-active', routeId === selectedRouteId);
    button.classList.toggle('is-running', routeId === activeRouteId);
    button.disabled = isBatchBenchmarkRunning;
  }
}

function setVariantButtonsDisabled(disabled) {
  for (const button of variantButtons.values()) {
    button.disabled = disabled;
  }
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
  const handleResize = () => {
    const width = Math.max(1, Math.round(canvasElement.clientWidth || window.innerWidth || 1));
    const height = Math.max(1, Math.round(canvasElement.clientHeight || window.innerHeight || 1));
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
  const orbit = createOrbitController(camera, canvasElement, initialPosition, initialTarget, performanceMode);

  const runtimeState = {
    variantId: variant.id,
    app,
    canvasElement,
    orbit,
    benchmark: timings.benchmark ?? beginVariantBenchmark(variant.id),
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
    const orbitChanged = updateOrbitController(runtimeState.orbit, dt);
    const performanceChanged = updatePerformanceMode(runtimeState.performanceMode, app, dt);
    const isMoving = routeChanged || orbitChanged || runtimeState.performanceMode.isInteracting;
    const unifiedLodChanged = updateUnifiedLodWarmup(runtimeState, dt, isMoving);
    const hasActiveRoutePlayback = Boolean(runtimeState.routePlayback);
    if (runtimeState.routeRecord && hasActiveRoutePlayback) {
      recordRouteFrame(runtimeState, dt);
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

  await loadVariantIntoRuntime(runtimeState, variant, timings);
  return runtimeState;
}

async function loadVariantIntoRuntime(runtimeState, variant, timings: any = {}) {
  if (!runtimeState?.app) {
    throw new Error('运行时尚未初始化');
  }

  runtimeState.loopController?.wake?.();
  detachVariantFromRuntime(runtimeState);

  const benchmark = timings.benchmark ?? beginVariantBenchmark(variant.id);
  runtimeState.variantId = variant.id;
  runtimeState.variantMeta = variant;
  runtimeState.benchmark = benchmark;
  runtimeState.routePlayback = null;
  runtimeState.routeRecord = null;
  runtimeState.unifiedLodState = null;

  const splatAsset = new pc.Asset(`ruoshui-${variant.id}`, 'gsplat', { url: variant.assetUrl });
  const assetLoadStartedAt = performance.now();

  await new Promise<void>((resolve, reject) => {
    const loader = new pc.AssetListLoader([splatAsset], runtimeState.app.assets);
    const onError = (err, asset) => {
      runtimeState.app.assets.off('error', onError);
      reject(new Error(`加载 ${asset.name} 失败：${String(err)}`));
    };

    runtimeState.app.assets.on('error', onError);
    loader.load(() => {
      runtimeState.app.assets.off('error', onError);
      benchmark.loadMs = performance.now() - assetLoadStartedAt;
      publishVariantBenchmark(variant.id);
      resolve();
    });
  });

  const splat = new pc.Entity('RuoshuiCampus');
  const gsplatComponent: any = {
    asset: splatAsset
  };

  if (variant.unified) {
    gsplatComponent.unified = true;
  }

  if (variant.lodDistances) {
    gsplatComponent.lodDistances = variant.lodDistances;
  }

  splat.addComponent('gsplat', gsplatComponent);
  runtimeState.app.root.addChild(splat);
  runtimeState.splatAsset = splatAsset;
  runtimeState.splatEntity = splat;
  runtimeState.unifiedLodState = configureUnifiedGsplat(runtimeState.app, variant);
  trackFirstFrame(runtimeState.app, variant.id, timings.switchStartedAt);
  runtimeState.requestRender?.();
}

function detachVariantFromRuntime(runtimeState) {
  if (!runtimeState?.app) {
    return;
  }

  if (runtimeState.splatEntity) {
    runtimeState.splatEntity.destroy();
    runtimeState.splatEntity = null;
  }

  if (runtimeState.splatAsset) {
    runtimeState.splatAsset.unload?.();
    runtimeState.app.assets.remove(runtimeState.splatAsset);
    runtimeState.splatAsset = null;
  }
}

function moveCamera(runtimeState, preset, immediate = false) {
  setOrbitPreset(runtimeState.orbit, vec3(preset.position), vec3(preset.target), immediate);
  runtimeState.requestRender();
}

function startBenchmarkRoute(runtimeState, route, options: any = {}) {
  if (!runtimeState || !route?.steps?.length) {
    return;
  }

  beginMotionSession(runtimeState.benchmark);
  publishVariantBenchmark(runtimeState.variantId);
  runtimeState.routeRecord = createRouteRunRecord(route, runtimeState.variantId);
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
  setOrbitPreset(runtimeState.orbit, vec3(step.position), vec3(step.target), immediate, duration);
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
  if (!runtimeState?.orbit) {
    return null;
  }

  const { orbit } = runtimeState;
  return {
    target: orbit.currentTarget.clone(),
    yaw: orbit.currentYaw,
    pitch: orbit.currentPitch,
    distance: orbit.currentDistance
  };
}

function restoreCurrentView(runtimeState, snapshot) {
  if (!runtimeState?.orbit || !snapshot) {
    return false;
  }

  const { orbit } = runtimeState;
  const clampedPitch = clampOrbitPitch(snapshot.pitch);
  orbit.transition = null;
  orbit.currentTarget.copy(snapshot.target);
  orbit.desiredTarget.copy(snapshot.target);
  orbit.currentYaw = snapshot.yaw;
  orbit.desiredYaw = snapshot.yaw;
  orbit.currentPitch = clampedPitch;
  orbit.desiredPitch = clampedPitch;
  orbit.currentDistance = snapshot.distance;
  orbit.desiredDistance = snapshot.distance;
  applyOrbit(orbit, 1);
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

function createLoopController(app) {
  const originalTick = app.tick.bind(app);
  let sleeping = false;

  return {
    get isSleeping() {
      return sleeping;
    },
    sleep() {
      if (sleeping) {
        return;
      }

      sleeping = true;
      app.tick = () => {};
    },
    wake() {
      if (!sleeping) {
        return;
      }

      sleeping = false;
      app.tick = originalTick;
      window.requestAnimationFrame((timestamp) => {
        originalTick(timestamp);
      });
    }
  };
}

function initLongTaskObserver() {
  if (typeof PerformanceObserver === 'undefined') {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTaskBuffer.push({
          startTime: entry.startTime,
          duration: entry.duration
        });
      }
    });

    observer.observe({ type: 'longtask', buffered: true });
  } catch {
    return;
  }
}

function createRouteRunRecord(route: BenchmarkRoute, variantId: string): RouteRunRecord {
  const variant = variantsById.get(variantId);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    suiteId: activeSuiteRunId,
    routeId: route.id,
    routeName: route.name,
    variantId,
    variantName: variant?.name ?? variantId,
    renderScalePercent: activeRenderScalePercent,
    startedAt: Date.now(),
    startedPerfTime: performance.now(),
    longTaskStartIndex: longTaskBuffer.length,
    resourceStartIndex: performance.getEntriesByType('resource').length,
    frames: [],
    lodWarmups: []
  };
}

function recordRouteFrame(runtimeState, dt) {
  const { orbit, routeRecord, routePlayback } = runtimeState ?? {};
  if (!orbit || !routeRecord || !routePlayback) {
    return;
  }

  const position = orbit.camera.getPosition();
  const target = orbit.currentTarget;
  routeRecord.frames.push([
    Number((performance.now() - routeRecord.startedPerfTime).toFixed(2)),
    Number((dt * 1000).toFixed(2)),
    routePlayback.stepIndex,
    Number(position.x.toFixed(3)),
    Number(position.y.toFixed(3)),
    Number(position.z.toFixed(3)),
    Number(target.x.toFixed(3)),
    Number(target.y.toFixed(3)),
    Number(target.z.toFixed(3)),
    Number(orbit.currentDistance.toFixed(3)),
    Math.round(radToDeg(orbit.currentPitch)),
    Math.round(radToDeg(orbit.currentYaw))
  ]);
}

function finalizeRouteRunRecord(runtimeState, status) {
  const record = runtimeState?.routeRecord;
  if (!record) {
    return null;
  }

  const finishedPerfTime = performance.now();
  const metrics = snapshotBenchmarkMetrics(runtimeState.benchmark);
  const longTasks = getRouteRunLongTasks(record, finishedPerfTime);
  const modelResources = getRouteRunModelResources(record, finishedPerfTime);
  const analysis = analyzeRouteRun(record, longTasks, modelResources, getRouteStepLabel);
  const finalizedRecord = {
    ...record,
    status,
    finishedAt: Date.now(),
    loadMs: runtimeState.benchmark.loadMs,
    firstFrameMs: runtimeState.benchmark.firstFrameMs,
    motionAvgMs: metrics.averageMs,
    motionMaxMs: metrics.maxMs,
    analysis,
    trace: {
      frames: record.frames,
      longTasks,
      modelResources,
      lodWarmups: record.lodWarmups
    }
  };

  routeRunHistory.unshift(finalizedRecord);
  routeRunHistory.length = Math.min(routeRunHistory.length, maxRouteRunHistory);
  persistRouteRunHistory(routeRunHistory);
  renderRouteRunHistory();
  renderRouteAnalysis();
  runtimeState.routeRecord = null;
  return finalizedRecord;
}

function snapshotBenchmarkMetrics(benchmark) {
  if (!benchmark) {
    return {
      averageMs: null,
      maxMs: null
    };
  }

  const averageMs = benchmark.wasMoving && benchmark.motionFrames > 0 && benchmark.motionTime > 0
    ? (benchmark.motionTime / benchmark.motionFrames) * 1000
    : benchmark.lastMotionMs;
  const maxMs = benchmark.wasMoving && Number.isFinite(benchmark.motionMaxMs)
    ? benchmark.motionMaxMs
    : benchmark.lastMotionMaxMs;

  return {
    averageMs: Number.isFinite(averageMs) ? averageMs : null,
    maxMs: Number.isFinite(maxMs) ? maxMs : null
  };
}

function getRouteRunLongTasks(record, finishedPerfTime) {
  return longTaskBuffer
    .slice(record.longTaskStartIndex)
    .filter((entry) => entry.startTime <= finishedPerfTime && entry.startTime + entry.duration >= record.startedPerfTime)
    .map((entry) => ({
      startMs: Number((entry.startTime - record.startedPerfTime).toFixed(2)),
      durationMs: Number(entry.duration.toFixed(2))
    }));
}

function getRouteRunModelResources(record, finishedPerfTime) {
  return (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
    .slice(record.resourceStartIndex)
    .filter((entry) => entry.startTime <= finishedPerfTime)
    .filter((entry) => isTrackedModelResource(entry.name))
    .map((entry) => ({
      name: simplifyResourceName(entry.name),
      startMs: Number((entry.startTime - record.startedPerfTime).toFixed(2)),
      durationMs: Number(entry.duration.toFixed(2)),
      transferSize: entry.transferSize ?? 0,
      encodedBodySize: entry.encodedBodySize ?? 0
    }));
}

function getRouteStepLabel(routeId, stepIndex) {
  const route = routeId ? benchmarkRoutesById.get(routeId) : null;
  const totalSteps = route?.steps?.length ?? null;
  const ordinal = Number.isFinite(stepIndex) ? stepIndex + 1 : 0;
  return totalSteps
    ? `Step ${ordinal}/${totalSteps}`
    : `Step ${ordinal}`;
}

function renderRouteRunHistory() {
  routeLogSummary.textContent = routeRunHistory.length > 0 ? `${routeRunHistory.length} 条` : '暂无';
  routeLogList.replaceChildren();

  if (routeRunHistory.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'route-log-empty';
    empty.textContent = '跑一次轨迹后，这里会自动留下对比记录。';
    routeLogList.append(empty);
    return;
  }

  for (const entry of routeRunHistory) {
    const item = document.createElement('article');
    item.className = 'route-log-item';
    item.innerHTML = `
      <div class="route-log-line">
        <strong>${entry.routeName}</strong>
        <span class="route-log-status is-${entry.status}">${formatRouteRunStatus(entry.status)}</span>
      </div>
      <div class="route-log-meta">${entry.variantName} · ${entry.renderScalePercent}% · ${formatRouteRunTime(entry.finishedAt ?? entry.startedAt)}</div>
      <div class="route-log-metrics">
        <span>漫游 ${formatMetricMs(entry.motionAvgMs)} / ${formatMetricPeakMs(entry.motionMaxMs)}</span>
        <span>首帧 ${formatMetricMs(entry.firstFrameMs)}</span>
      </div>
    `;
    routeLogList.append(item);
  }
}

function renderRouteAnalysis() {
  const records = getLatestSuiteRecords();
  routeAnalysisRanking.replaceChildren();
  routeAnalysisHotspots.replaceChildren();

  if (records.length === 0) {
    routeAnalysisSummary.textContent = '等待批量测试';
    routeAnalysisCopyNote.textContent = '跑完一轮标准测试后可复制。';
    routeAnalysisRanking.innerHTML = '<div class="route-analysis-empty">运行“当前轨迹 × 全版本”后，这里会出现排行榜和卡顿热点。</div>';
    routeAnalysisHotspots.innerHTML = '';
    return;
  }

  const summary = buildRouteAnalysisSummary(records);
  routeAnalysisSummary.textContent = `${summary.routeName} · ${records.length} 版`;
  routeAnalysisCopyNote.textContent = `最新批次：${summary.suiteId} · 可复制或下载`;

  for (const item of summary.ranking) {
    const card = document.createElement('article');
    card.className = 'route-analysis-item';
    card.innerHTML = `
      <div class="route-analysis-line">
        <strong>${item.variantName}</strong>
        <span>${item.avgMs} / ${item.peakMs} ms</span>
      </div>
      <div class="route-analysis-meta">P95 ${item.p95Ms} · P99 ${item.p99Ms} · 卡顿 ${item.stallCount} 次</div>
      <div class="route-analysis-meta">最差段 ${item.worstStepLabel} · P95 ${item.worstStepP95Ms} · 峰值 ${item.worstStepPeakMs}</div>
    `;
    routeAnalysisRanking.append(card);
  }

  if (summary.hotspots.length === 0) {
    routeAnalysisHotspots.innerHTML = '<div class="route-analysis-empty">这一批次还没采到明显卡顿热点。</div>';
    return;
  }

  for (const hotspot of summary.hotspots) {
    const card = document.createElement('article');
    card.className = 'route-hotspot-item';
    card.innerHTML = `
      <div class="route-analysis-line">
        <strong>${hotspot.variantName}</strong>
        <span>${hotspot.peakMs} ms</span>
      </div>
      <div class="route-analysis-meta">${hotspot.stepLabel} · ${hotspot.likelyCause}</div>
      <div class="route-analysis-meta">窗口 ${hotspot.startMs}-${hotspot.endMs} ms · 长任务 ${hotspot.longTaskCount} 次 / 资源 ${hotspot.modelResourceCount} 次</div>
      <div class="route-analysis-meta">视角 ${hotspot.camera.distance}m · ${hotspot.camera.pitch}° / ${hotspot.camera.yaw}°</div>
      ${hotspot.resourceSummary ? `<div class="route-analysis-meta">${hotspot.resourceSummary}</div>` : ''}
    `;
    routeAnalysisHotspots.append(card);
  }
}

function getLatestSuiteRecords() {
  const latestSuiteId = routeRunHistory.find((entry) => entry.suiteId)?.suiteId;
  if (!latestSuiteId) {
    return [];
  }

  return routeRunHistory.filter((entry) => entry.suiteId === latestSuiteId);
}

function buildRouteAnalysisSummary(records) {
  const sorted = [...records].sort((left, right) => (left.analysis?.frameStats?.avgMs ?? Infinity) - (right.analysis?.frameStats?.avgMs ?? Infinity));
  const hotspots = records
    .flatMap((record) => (record.analysis?.hotspots ?? []).map((hotspot) => ({
      ...hotspot,
      variantId: record.variantId,
      variantName: record.variantName,
      resourceSummary: formatHotspotResourceSummary(hotspot.resources)
    })))
    .sort((left, right) => right.peakMs - left.peakMs)
    .slice(0, 5);

  return {
    suiteId: records[0]?.suiteId ?? 'manual',
    routeName: records[0]?.routeName ?? '未知轨迹',
    ranking: sorted.map((record) => ({
      variantId: record.variantId,
      variantName: record.variantName,
      avgMs: formatMetricText(record.analysis?.frameStats?.avgMs),
      p95Ms: formatMetricText(record.analysis?.frameStats?.p95Ms),
      p99Ms: formatMetricText(record.analysis?.frameStats?.p99Ms),
      peakMs: formatMetricText(record.analysis?.frameStats?.peakMs),
      stallCount: record.analysis?.stallCount ?? 0,
      worstStepLabel: formatWorstStepLabel(record.analysis?.stepStats),
      worstStepP95Ms: formatMetricText(getWorstStep(record.analysis?.stepStats)?.p95Ms),
      worstStepPeakMs: formatMetricText(getWorstStep(record.analysis?.stepStats)?.peakMs)
    })),
    hotspots
  };
}

async function copyLatestRouteAnalysis(mode) {
  const exportPayload = getLatestRouteAnalysisExport();
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
  const exportPayload = getLatestRouteAnalysisExport();
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
  routeAnalysisCopyNote.textContent = text;
  if (routeAnalysisCopyTimeoutId) {
    window.clearTimeout(routeAnalysisCopyTimeoutId);
  }

  routeAnalysisCopyTimeoutId = window.setTimeout(() => {
    const records = getLatestSuiteRecords();
    routeAnalysisCopyNote.textContent = records.length > 0
      ? `最新批次：${records[0].suiteId} · 可复制或下载`
      : '跑完一轮标准测试后可复制。';
    routeAnalysisCopyTimeoutId = null;
  }, routeAnalysisCopyFeedbackMs);
}

function formatRouteAnalysisSummaryText(summary, records) {
  const rankingLines = summary.ranking
    .map((item, index) => `${index + 1}. ${item.variantName}: avg ${item.avgMs}, p95 ${item.p95Ms}, peak ${item.peakMs}, stalls ${item.stallCount}, worst ${item.worstStepLabel} (${item.worstStepP95Ms})`)
    .join('\n');
  const hotspotLines = summary.hotspots.length > 0
    ? summary.hotspots
      .map((hotspot, index) => `${index + 1}. ${hotspot.variantName} / ${hotspot.stepLabel}: ${hotspot.peakMs} ms, ${hotspot.likelyCause}, 视角 ${hotspot.camera.distance}m ${hotspot.camera.pitch}°/${hotspot.camera.yaw}°, 资源 ${hotspot.modelResourceCount}, 长任务 ${hotspot.longTaskCount}`)
      .join('\n')
    : '无明显热点';

  return [
    `Suite: ${summary.suiteId}`,
    `Route: ${summary.routeName}`,
    '',
    'Ranking:',
    rankingLines,
    '',
    'Hotspots:',
    hotspotLines,
    '',
    `Records: ${records.length}`
  ].join('\n');
}

function getLatestRouteAnalysisExport() {
  const records = getLatestSuiteRecords();
  if (records.length === 0) {
    return null;
  }

  return {
    exportedAt: new Date().toISOString(),
    frameSchema: Object.keys(frameSampleIndices),
    summary: buildRouteAnalysisSummary(records),
    records
  };
}

function installRouteAnalysisBridge() {
  window.__ruoshuiPerf = {
    latest() {
      return getLatestRouteAnalysisExport();
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
      persistRouteRunHistory(routeRunHistory);
      renderRouteRunHistory();
      renderRouteAnalysis();
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

function getInitialRouteRunHistory(): RouteRunRecord[] {
  try {
    const saved = window.localStorage.getItem(routeRunHistoryStorageKey);
    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.slice(0, maxRouteRunHistory) : [];
  } catch {
    return [];
  }
}

function persistRouteRunHistory(history) {
  try {
    window.localStorage.setItem(routeRunHistoryStorageKey, JSON.stringify(history));
  } catch {
    return;
  }
}

function beginVariantBenchmark(variantId: string): VariantBenchmark {
  const benchmark = {
    loadMs: null,
    firstFrameMs: null,
    motionTime: 0,
    motionFrames: 0,
    motionMaxMs: null,
    lastMotionMs: null,
    lastMotionMaxMs: null,
    wasMoving: false
  };
  variantBenchmarks.set(variantId, benchmark);
  return benchmark;
}

function getVariantBenchmark(variantId: string | null | undefined): VariantBenchmark | null {
  if (!variantId) {
    return null;
  }

  if (!variantBenchmarks.has(variantId)) {
    return beginVariantBenchmark(variantId);
  }

  return variantBenchmarks.get(variantId) ?? null;
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

function beginMotionSession(benchmark) {
  if (!benchmark) {
    return;
  }

  benchmark.motionTime = 0;
  benchmark.motionFrames = 0;
  benchmark.motionMaxMs = null;
  benchmark.wasMoving = true;
}

function sampleMotionFrame(benchmark, dt) {
  if (!benchmark) {
    return;
  }

  if (!benchmark.wasMoving) {
    beginMotionSession(benchmark);
  }

  benchmark.motionFrames += 1;
  benchmark.motionTime += dt;
  const frameMs = dt * 1000;
  benchmark.motionMaxMs = benchmark.motionMaxMs === null
    ? frameMs
    : Math.max(benchmark.motionMaxMs, frameMs);
}

function endMotionSession(benchmark) {
  if (!benchmark?.wasMoving) {
    return false;
  }

  benchmark.wasMoving = false;
  if (benchmark.motionFrames > 0 && benchmark.motionTime > 0) {
    benchmark.lastMotionMs = (benchmark.motionTime / benchmark.motionFrames) * 1000;
    benchmark.lastMotionMaxMs = benchmark.motionMaxMs;
    return true;
  }

  return false;
}

function trackFirstFrame(app, variantId, switchStartedAt) {
  if (!Number.isFinite(switchStartedAt)) {
    return;
  }

  const resolveFirstFrame = () => {
    const benchmark = getVariantBenchmark(variantId);
    if (!benchmark || Number.isFinite(benchmark.firstFrameMs)) {
      return;
    }

    benchmark.firstFrameMs = performance.now() - switchStartedAt;
    publishVariantBenchmark(variantId);
  };

  app.once('frameend', resolveFirstFrame);
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(resolveFirstFrame);
  });
}

function vec3(tuple) {
  return new pc.Vec3(tuple[0], tuple[1], tuple[2]);
}

function createOrbitController(camera, canvasElement, initialPosition, initialTarget, performanceMode): any {
  const spherical = positionToOrbit(initialPosition, initialTarget);

  const orbit: any = {
    camera,
    canvasElement,
    currentTarget: initialTarget.clone(),
    desiredTarget: initialTarget.clone(),
    currentYaw: spherical.yaw,
    desiredYaw: spherical.yaw,
    currentPitch: spherical.pitch,
    desiredPitch: spherical.pitch,
    currentDistance: spherical.distance,
    desiredDistance: spherical.distance,
    minDistance: 0.35,
    maxDistance: 12,
    rotateSpeed: 0.0055,
    panSpeed: 0.0018,
    zoomSpeed: 0.0012,
    damping: 0.14,
    pointerMode: null,
    lastX: 0,
    lastY: 0,
    transition: null,
    onManualInput: null,
    tempRight: new pc.Vec3(),
    tempUp: new pc.Vec3(),
    tempPosition: new pc.Vec3()
  };

  const beginPointer = (event: any) => {
    orbit.onManualInput?.();
    orbit.pointerMode = event.button === 2 ? 'pan' : 'rotate';
    if (performanceMode) {
      performanceMode.isInteracting = true;
    }
    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;
  };

  const endPointer = () => {
    orbit.cancelInteraction();
  };

  const movePointer = (event: any) => {
    if (!orbit.pointerMode) {
      return;
    }

    const dx = event.clientX - orbit.lastX;
    const dy = event.clientY - orbit.lastY;
    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;

    if (orbit.pointerMode === 'rotate') {
      orbit.transition = null;
      orbit.desiredYaw -= dx * orbit.rotateSpeed;
      orbit.desiredPitch = clampOrbitPitch(orbit.desiredPitch - dy * orbit.rotateSpeed);
      return;
    }

    const distanceFactor = Math.max(orbit.currentDistance, 0.5);
    const right = orbit.tempRight.copy(camera.right).mulScalar(-dx * orbit.panSpeed * distanceFactor);
    const up = orbit.tempUp.copy(camera.up).mulScalar(dy * orbit.panSpeed * distanceFactor);
    orbit.transition = null;
    orbit.desiredTarget.add(right).add(up);
  };

  const onWheel = (event: any) => {
    event.preventDefault();
    orbit.onManualInput?.();
    orbit.transition = null;
    const scale = Math.exp(event.deltaY * orbit.zoomSpeed);
    orbit.desiredDistance = clamp(
      orbit.desiredDistance * scale,
      orbit.minDistance,
      orbit.maxDistance
    );
  };

  canvasElement.addEventListener('mousedown', beginPointer);
  window.addEventListener('mousemove', movePointer);
  window.addEventListener('mouseup', endPointer);
  canvasElement.addEventListener('wheel', onWheel, { passive: false });

  orbit.destroy = () => {
    canvasElement.removeEventListener('mousedown', beginPointer);
    window.removeEventListener('mousemove', movePointer);
    window.removeEventListener('mouseup', endPointer);
    canvasElement.removeEventListener('wheel', onWheel);
  };

  orbit.cancelInteraction = () => {
    orbit.pointerMode = null;
    if (performanceMode) {
      performanceMode.isInteracting = false;
    }
  };

  applyOrbit(orbit, 1);
  return orbit;
}

function setOrbitPreset(orbit, position, target, immediate, duration = 1.35) {
  const spherical = positionToOrbit(position, target);
  const clampedPitch = clampOrbitPitch(spherical.pitch);

  if (immediate) {
    orbit.transition = null;
    orbit.currentTarget.copy(target);
    orbit.desiredTarget.copy(target);
    orbit.currentYaw = spherical.yaw;
    orbit.desiredYaw = spherical.yaw;
    orbit.currentPitch = clampedPitch;
    orbit.desiredPitch = clampedPitch;
    orbit.currentDistance = spherical.distance;
    orbit.desiredDistance = spherical.distance;
    applyOrbit(orbit, 1);
    return;
  }

  orbit.transition = {
    elapsed: 0,
    duration: Math.max(duration, 0.01),
    fromTarget: orbit.desiredTarget.clone(),
    toTarget: target.clone(),
    fromYaw: orbit.desiredYaw,
    toYaw: spherical.yaw,
    fromPitch: orbit.desiredPitch,
    toPitch: clampedPitch,
    fromDistance: orbit.desiredDistance,
    toDistance: spherical.distance
  };
}

function updateOrbitController(orbit, dt) {
  if (orbit.transition) {
    orbit.transition.elapsed = Math.min(orbit.transition.elapsed + dt, orbit.transition.duration);
    const alpha = orbit.transition.elapsed / orbit.transition.duration;
    const eased = easeInOutCubic(alpha);

    orbit.desiredTarget.lerp(orbit.transition.fromTarget, orbit.transition.toTarget, eased);
    orbit.desiredYaw = lerpAngle(orbit.transition.fromYaw, orbit.transition.toYaw, eased);
    orbit.desiredPitch = lerp(orbit.transition.fromPitch, orbit.transition.toPitch, eased);
    orbit.desiredDistance = lerp(
      orbit.transition.fromDistance,
      orbit.transition.toDistance,
      eased
    );

    if (alpha >= 1) {
      orbit.transition = null;
    }
  }

  return applyOrbit(orbit, orbit.damping);
}

function applyOrbit(orbit, damping) {
  const previousTargetX = orbit.currentTarget.x;
  const previousTargetY = orbit.currentTarget.y;
  const previousTargetZ = orbit.currentTarget.z;
  const previousYaw = orbit.currentYaw;
  const previousPitch = orbit.currentPitch;
  const previousDistance = orbit.currentDistance;
  const blend = damping >= 1 ? 1 : 1 - Math.pow(1 - damping, 2);
  orbit.currentTarget.lerp(orbit.currentTarget, orbit.desiredTarget, blend);
  orbit.currentYaw = lerpAngle(orbit.currentYaw, orbit.desiredYaw, blend);
  orbit.currentPitch = lerp(orbit.currentPitch, orbit.desiredPitch, blend);
  orbit.currentDistance = lerp(orbit.currentDistance, orbit.desiredDistance, blend);

  const position = orbitToPosition(
    orbit.currentTarget,
    orbit.currentYaw,
    orbit.currentPitch,
    orbit.currentDistance,
    orbit.tempPosition
  );
  orbit.camera.setPosition(position);
  orbit.camera.lookAt(orbit.currentTarget);

  return (
    Math.abs(previousTargetX - orbit.currentTarget.x) > 0.00001 ||
    Math.abs(previousTargetY - orbit.currentTarget.y) > 0.00001 ||
    Math.abs(previousTargetZ - orbit.currentTarget.z) > 0.00001 ||
    Math.abs(previousYaw - orbit.currentYaw) > 0.00001 ||
    Math.abs(previousPitch - orbit.currentPitch) > 0.00001 ||
    Math.abs(previousDistance - orbit.currentDistance) > 0.00001
  );
}

function positionToOrbit(position, target) {
  const offset = position.clone().sub(target);
  const distance = Math.max(offset.length(), 0.0001);
  return {
    distance,
    yaw: Math.atan2(offset.x, offset.z),
    pitch: clampOrbitPitch(Math.asin(clamp(offset.y / distance, -1, 1)))
  };
}

function clampOrbitPitch(value) {
  return clamp(value, degToRad(minOrbitPitchDeg), degToRad(maxOrbitPitchDeg));
}

function orbitToPosition(target, yaw, pitch, distance, out = new pc.Vec3()) {
  const cosPitch = Math.cos(pitch);
  return out.set(
    target.x + Math.sin(yaw) * cosPitch * distance,
    target.y + Math.sin(pitch) * distance,
    target.z + Math.cos(yaw) * cosPitch * distance
  );
}

function renderCameraMeta(runtimeState) {
  if (!runtimeState?.orbit) {
    cameraPosition.textContent = '—';
    cameraTarget.textContent = '—';
    cameraDistance.textContent = '—';
    cameraAngle.textContent = '—';
    cameraSummary.textContent = '等待视角';
    return;
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
    return;
  }

  runtimeState.lastCameraSnapshot = snapshot;
  cameraPosition.textContent = formatVec3(position);
  cameraTarget.textContent = formatVec3(target);
  cameraDistance.textContent = `${distance.toFixed(2)} m`;
  cameraAngle.textContent = `${pitch}° / ${yaw}°`;
  cameraSummary.textContent = `${distance.toFixed(2)} m · ${pitch}°`;
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
