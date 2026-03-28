import {
  currentVariantRepeatCount,
  frameSampleIndices,
  maxRouteRunHistory,
  routeAnalysisCopyFeedbackMs,
  routeRunHistoryStorageKey,
} from "./config";
import { getInitialRouteRunHistory } from "./benchmark/history";
import { createRouteDiagnosticsController } from "./benchmark/diagnostics-controller";
import { createRouteBenchmarkController } from "./benchmark/route-benchmark-controller";
import {
  beginStoredVariantBenchmark,
  getStoredVariantBenchmark,
  initLongTaskObserver,
} from "./benchmark/runtime";
import {
  advanceRuntimeBenchmarkRoute as advanceBenchmarkPlaybackRoute,
  captureRuntimeView,
  moveRuntimeCamera,
  restoreRuntimeView,
  startRuntimeBenchmarkRoute,
  stopRuntimeBenchmarkRoute as stopBenchmarkPlaybackRoute,
  updateRuntimeBenchmarkRoute as updateBenchmarkPlaybackRoute,
} from "./benchmark/playback";
import {
  applyRenderScaleToRuntime,
  getInitialRenderScalePercent,
  getMaxSupportedPixelRatio,
  normalizeRenderScalePercent,
  persistRenderScalePercent,
} from "./performance/render-scale";
import { createViewerRuntime } from "./runtime/runtime-factory";
import {
  applyRuntimeSceneLook,
  formatSceneLookSummary,
  loadSceneLookSettings,
  normalizeSceneLookSettings,
  persistSceneLookSettings,
} from "./runtime/scene-look";
import { createVariantOrchestrationController } from "./runtime/variant-orchestration";
import type { RouteRunRecord, VariantBenchmark, ViewerContent } from "./types";
import { createViewerPanelController } from "./ui/viewer-panel-controller";
import {
  initializeViewerStartup,
  installViewerStartupBindings,
} from "./ui/viewer-startup-controller";
import { createViewerShellController } from "./ui/viewer-shell-controller";
import { requireElement } from "./utils/dom";

const pc: any = await import(
  /* @vite-ignore */ "https://esm.sh/playcanvas@2.17.2?bundle"
);

const data = window.__ruoshuiInitialData;

if (!data) {
  throw new Error("Missing initial viewer content");
}

const showPerfHud = import.meta.env.DEV;
const variantsById = new Map(
  data.variants.map((variant) => [variant.id, variant]),
);
const benchmarkRoutes = data.benchmarkRoutes ?? [];
const benchmarkRoutesById = new Map(
  benchmarkRoutes.map((route) => [route.id, route]),
);
const firstPreset = data.presets[0];
const defaultVariant =
  variantsById.get(data.scene.defaultVariantId) ?? data.variants[0];
const maxRenderScalePercent = Math.round(
  getMaxSupportedPixelRatio(window) * 100,
);
let activeRenderScalePercent = getInitialRenderScalePercent(
  window,
  maxRenderScalePercent,
);
let activeSceneLook = loadSceneLookSettings(window);
const longTaskBuffer: Array<{ startTime: number; duration: number }> = [];

initLongTaskObserver(longTaskBuffer);

const sceneContainer = requireElement<HTMLDivElement>("#scene");
const copyRouteAnalysisSummaryButton = requireElement<HTMLButtonElement>(
  "#copy-route-analysis-summary",
);
const copyRouteAnalysisJsonButton = requireElement<HTMLButtonElement>(
  "#copy-route-analysis-json",
);
const downloadRouteAnalysisJsonButton = requireElement<HTMLButtonElement>(
  "#download-route-analysis-json",
);
const renderScaleSlider = requireElement<HTMLInputElement>(
  "#render-scale-slider",
);
const statusTitle = requireElement<HTMLElement>("#status-title");
const statusDetail = requireElement<HTMLElement>("#status-detail");
const variantSize = requireElement<HTMLElement>("#variant-size");
const variantSplats = requireElement<HTMLElement>("#variant-splats");
const variantRetention = requireElement<HTMLElement>("#variant-retention");
const variantTitle = requireElement<HTMLElement>("#variant-title");
const variantNote = requireElement<HTMLElement>("#variant-note");
const metricLoad = requireElement<HTMLElement>("#metric-load");
const metricFirstFrame = requireElement<HTMLElement>("#metric-first-frame");
const metricMotion = requireElement<HTMLElement>("#metric-motion");
const renderScaleValue = requireElement<HTMLElement>("#render-scale-value");
const renderScaleNote = requireElement<HTMLElement>("#render-scale-note");
const sceneLookSummary = requireElement<HTMLElement>("#scene-look-summary");
const sceneLookBrightness = requireElement<HTMLInputElement>(
  "#scene-look-brightness",
);
const sceneLookBrightnessValue = requireElement<HTMLElement>(
  "#scene-look-brightness-value",
);
const sceneLookContrast = requireElement<HTMLInputElement>(
  "#scene-look-contrast",
);
const sceneLookContrastValue = requireElement<HTMLElement>(
  "#scene-look-contrast-value",
);
const sceneLookSaturation = requireElement<HTMLInputElement>(
  "#scene-look-saturation",
);
const sceneLookSaturationValue = requireElement<HTMLElement>(
  "#scene-look-saturation-value",
);
const focusSceneButton = requireElement<HTMLButtonElement>("#focus-scene");
const focusOverviewButton =
  requireElement<HTMLButtonElement>("#focus-overview");
const qualitySummary = requireElement<HTMLElement>("#quality-summary");
const presetsSummary = requireElement<HTMLElement>("#presets-summary");
const perfFps = showPerfHud ? requireElement<HTMLElement>("#perf-fps") : null;
const perfMs = showPerfHud ? requireElement<HTMLElement>("#perf-ms") : null;
const perfRender = showPerfHud
  ? requireElement<HTMLElement>("#perf-render")
  : null;
const perfScale = showPerfHud
  ? requireElement<HTMLElement>("#perf-scale")
  : null;
const inspectorToggles = [
  ...document.querySelectorAll<HTMLButtonElement>("[data-toggle]"),
];
const inspectorBodies = new Map(
  [...document.querySelectorAll<HTMLElement>("[data-body]")]
    .map((element) => [element.dataset.body ?? "", element] as const)
    .filter(([panelId]) => panelId),
);
if (inspectorToggles.length === 0 || inspectorBodies.size === 0) {
  throw new Error("Failed to initialize UI shell");
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
let routeSummaryText = "未播放";
const variantBenchmarks = new Map<string, VariantBenchmark>();
const routeRunHistory: RouteRunRecord[] = getInitialRouteRunHistory(
  routeRunHistoryStorageKey,
  maxRouteRunHistory,
);
const viewerPanelController = createViewerPanelController({
  variants: data.variants,
  defaultVariant,
  presets: data.presets,
  firstPreset,
  benchmarkRoutes,
  variantCount: data.variants.length,
  currentVariantRepeatCount,
  getActiveVariantId: () => activeVariantId,
  getActivePresetId: () => activePresetId,
  getSelectedRouteId: () => selectedRouteId,
  getActiveRouteId: () => activeRouteId,
  getRouteSummaryText: () => routeSummaryText,
  getIsBatchBenchmarkRunning: () => isBatchBenchmarkRunning,
  getIsVariantPanelDisabled: () => isVariantPanelDisabled,
  setIsVariantPanelDisabled: (disabled) => {
    isVariantPanelDisabled = disabled;
  },
});
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
  runVariantRouteBenchmark: (options) => runVariantRouteBenchmark(options),
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
  stopActiveBenchmarkRoute,
});
const viewerShellController = createViewerShellController({
  inspectorToggles,
  inspectorBodies,
  variantSize,
  variantSplats,
  variantRetention,
  variantTitle,
  variantNote,
  metricLoad,
  metricFirstFrame,
  metricMotion,
  renderScaleValue,
  qualitySummary,
  renderScaleNote,
  showPerfHud,
  perfFps,
  perfMs,
  perfRender,
  perfScale,
  publishVariantPanel,
  getVariantBenchmark,
  getActiveVariantId: () => activeVariantId,
  getActiveRenderScalePercent: () => activeRenderScalePercent,
});
const variantOrchestrationController = createVariantOrchestrationController({
  pc,
  presets: data.presets,
  variantsById,
  sceneContainer,
  getRuntime: () => runtime,
  setRuntime: (runtimeState) => {
    runtime = runtimeState;
  },
  getActiveVariantId: () => activeVariantId,
  setActiveVariantId: (variantId) => {
    activeVariantId = variantId;
  },
  getActivePresetId: () => activePresetId,
  setActivePresetId: (presetId) => {
    activePresetId = presetId;
  },
  getActiveRouteId: () => activeRouteId,
  getSceneLook: () => activeSceneLook,
  issueLoadToken: () => {
    currentLoadToken += 1;
    return currentLoadToken;
  },
  isCurrentLoadToken: (loadToken) => loadToken === currentLoadToken,
  createBenchmark: (variantId) =>
    beginStoredVariantBenchmark(variantBenchmarks, variantId),
  renderVariantMeta: (variant) =>
    viewerShellController.renderVariantMeta(variant),
  updateVariantButtons,
  updatePresetButtons,
  setVariantButtonsDisabled,
  setPresetSummary: (summary) => {
    presetsSummary.textContent = summary;
  },
  setStatus: (title, detail) => {
    statusTitle.textContent = title;
    statusDetail.textContent = detail;
  },
  stopActiveBenchmarkRoute,
  captureCurrentView,
  restoreCurrentView,
  createRuntime,
  moveCamera,
  publishVariantBenchmark,
  getVariantBenchmark,
});

installViewerStartupBindings({
  focusSceneButton,
  focusOverviewButton,
  firstPresetId: firstPreset.id,
  activatePreset: (presetId) => activatePreset(presetId),
  activateVariant: (variantId) => activateVariant(variantId),
  activateBenchmarkRoute,
  runCurrentVariantRouteBenchmark,
  runRouteBenchmarkSuite,
  copyRouteAnalysisSummaryButton,
  copyRouteAnalysisJsonButton,
  downloadRouteAnalysisJsonButton,
  copyLatestRouteAnalysisSummary: () =>
    routeDiagnosticsController.copyLatestRouteAnalysis("summary"),
  copyLatestRouteAnalysisJson: () =>
    routeDiagnosticsController.copyLatestRouteAnalysis("json"),
  downloadLatestRouteAnalysisJson: () =>
    routeDiagnosticsController.downloadLatestRouteAnalysisJson(),
  renderScaleSlider,
  activateRenderScale,
  sceneLookInputs: [
    sceneLookBrightness,
    sceneLookContrast,
    sceneLookSaturation,
  ],
  applySceneLookFromControls,
  inspectorToggles,
  getOpenInspectorPanel: () => openInspectorPanel,
  setOpenInspectorPanel,
});

initializeViewerStartup({
  updatePresetButtons,
  updateVariantButtons,
  updateRouteButtons,
  publishRouteControls,
  renderVariantMeta,
  defaultVariant,
  renderRenderScaleMeta,
  activeRenderScalePercent,
  renderSceneLookMeta,
  activeSceneLook,
  renderCameraMeta,
  renderPerfHud,
  publishRouteDiagnostics: () => routeDiagnosticsController.publishRouteDiagnostics(),
  installRouteAnalysisBridge: () => routeDiagnosticsController.installRouteAnalysisBridge(),
  openInspectorPanel,
  setOpenInspectorPanel,
  statusTitle,
  statusDetail,
});

await activateVariant(defaultVariant.id, true);

function renderVariantMeta(variant) {
  viewerShellController.renderVariantMeta(variant);
}

function activateRenderScale(nextPercent) {
  const normalizedPercent = normalizeRenderScalePercent(
    nextPercent,
    maxRenderScalePercent,
  );
  activeRenderScalePercent = normalizedPercent;
  renderScaleSlider.value = String(normalizedPercent);
  persistRenderScalePercent(window, normalizedPercent);
  renderRenderScaleMeta(normalizedPercent);
  applyRenderScaleToRuntime(runtime, normalizedPercent, maxRenderScalePercent);
  renderPerfHud(runtime);
}

function renderRenderScaleMeta(percent) {
  viewerShellController.renderRenderScaleMeta(percent);
}

function applySceneLookFromControls() {
  const nextSceneLook = normalizeSceneLookSettings({
    brightnessPercent: Number(sceneLookBrightness.value),
    contrastPercent: Number(sceneLookContrast.value),
    saturationPercent: Number(sceneLookSaturation.value),
  });
  activeSceneLook = nextSceneLook;
  persistSceneLookSettings(window, nextSceneLook);
  renderSceneLookMeta(nextSceneLook);
  applyRuntimeSceneLook(runtime, nextSceneLook);
}

function renderSceneLookMeta(sceneLook) {
  sceneLookBrightness.value = String(sceneLook.brightnessPercent);
  sceneLookContrast.value = String(sceneLook.contrastPercent);
  sceneLookSaturation.value = String(sceneLook.saturationPercent);
  sceneLookBrightnessValue.textContent = `${sceneLook.brightnessPercent}%`;
  sceneLookContrastValue.textContent = `${sceneLook.contrastPercent}%`;
  sceneLookSaturationValue.textContent = `${sceneLook.saturationPercent}%`;
  sceneLookSummary.textContent = formatSceneLookSummary(sceneLook);
}

async function activateVariant(
  variantId,
  initial = false,
  forceReload = false,
) {
  return variantOrchestrationController.activateVariant(
    variantId,
    initial,
    forceReload,
  );
}

function activatePreset(presetId, immediate = false) {
  variantOrchestrationController.activatePreset(presetId, immediate);
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
  viewerShellController.setOpenInspectorPanel(panelId);
}

function updatePresetButtons() {
  viewerPanelController.updatePresetButtons();
}

function updateVariantButtons() {
  viewerPanelController.updateVariantButtons();
}

function updateRouteButtons() {
  viewerPanelController.updateRouteButtons();
}

function setVariantButtonsDisabled(disabled) {
  viewerPanelController.setVariantButtonsDisabled(disabled);
}

function publishVariantPanel() {
  viewerPanelController.publishVariantPanel();
}

function publishPresetPanel() {
  viewerPanelController.publishPresetPanel();
}

function publishRouteControls() {
  viewerPanelController.publishRouteControls();
}

async function createRuntime(
  canvasElement,
  variant,
  timings: any = {},
  sceneLook = activeSceneLook,
) {
  return createViewerRuntime({
    pc,
    canvasElement,
    variant,
    timings,
    runtimeWindow: window,
    runtimeDocument: document,
    renderScalePercent: activeRenderScalePercent,
    sceneLook,
    firstPreset,
    createBenchmark: (variantId) =>
      beginStoredVariantBenchmark(variantBenchmarks, variantId),
    getVariantBenchmark,
    publishVariantBenchmark,
    updateBenchmarkRoute,
    getActiveRouteId: () => activeRouteId,
    stopActiveBenchmarkRoute,
    renderCameraMeta,
    renderPerfHud,
  });
}

function moveCamera(runtimeState, preset, immediate = false) {
  moveRuntimeCamera({
    runtimeState,
    preset,
    immediate,
    pc,
    vec3,
  });
}

function startBenchmarkRoute(runtimeState, route, options: any = {}) {
  startRuntimeBenchmarkRoute({
    runtimeState,
    route,
    suiteId: activeSuiteRunId,
    renderScalePercent: activeRenderScalePercent,
    longTaskBuffer,
    onFinish: options.onFinish ?? null,
  });
  publishVariantBenchmark(runtimeState?.variantId);
  advanceBenchmarkRoute(runtimeState);
}

function stopBenchmarkRoute(runtimeState, status = "aborted") {
  stopBenchmarkPlaybackRoute({
    runtimeState,
    status,
    finalizeRouteRunRecord,
  });
}

function stopActiveBenchmarkRoute(summaryText = "未播放", status = "aborted") {
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
    },
  });
}

function updateBenchmarkRoute(runtimeState, dt) {
  return updateBenchmarkPlaybackRoute({
    runtimeState,
    dt,
    advanceRuntimeBenchmarkRoute: () => advanceBenchmarkRoute(runtimeState),
  });
}

function captureCurrentView(runtimeState) {
  return captureRuntimeView(runtimeState);
}

function restoreCurrentView(runtimeState, snapshot) {
  return restoreRuntimeView({
    runtimeState,
    snapshot,
    pc,
  });
}

function finalizeRouteRunRecord(runtimeState, status) {
  return routeDiagnosticsController.finalizeRouteRunRecord(
    runtimeState,
    status,
  );
}

function getVariantBenchmark(
  variantId: string | null | undefined,
): VariantBenchmark | null {
  return getStoredVariantBenchmark(variantBenchmarks, variantId);
}

function publishVariantBenchmark(variantId) {
  if (variantId === activeVariantId) {
    renderVariantBenchmark(variantId);
  }
}

function renderVariantBenchmark(variantId) {
  viewerShellController.renderVariantBenchmark(variantId);
}

function vec3(tuple) {
  return new pc.Vec3(tuple[0], tuple[1], tuple[2]);
}

function renderCameraMeta(runtimeState) {
  viewerShellController.renderCameraMeta(runtimeState);
}

function renderPerfHud(runtimeState) {
  viewerShellController.renderPerfHud(runtimeState);
}
