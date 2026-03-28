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
  applyRenderScaleToRuntime,
  getInitialRenderScalePercent,
  getMaxSupportedPixelRatio,
  normalizeRenderScalePercent,
  persistRenderScalePercent,
} from "./performance/render-scale";
import {
  applyRuntimeSceneLook,
  formatSceneLookSummary,
  loadSceneLookSettings,
  normalizeSceneLookSettings,
  persistSceneLookSettings,
} from "./runtime/scene-look";
import { createViewerRuntimeController } from "./runtime/viewer-runtime-controller";
import { createVariantOrchestrationController } from "./runtime/variant-orchestration";
import type { RouteRunRecord, VariantBenchmark, ViewerContent } from "./types";
import { createViewerPanelController } from "./ui/viewer-panel-controller";
import {
  initializeViewerStartup,
  installViewerStartupBindings,
} from "./ui/viewer-startup-controller";
import { createViewerShellController } from "./ui/viewer-shell-controller";
import { useViewerUiStore } from "./ui/viewer-ui-store";
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

let runtime: any = null;
let activePresetId = firstPreset.id;
let activeVariantId = defaultVariant.id;
let activeRouteId: string | null = null;
let selectedRouteId: string | null = benchmarkRoutes[0]?.id ?? null;
let currentLoadToken = 0;
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
const viewerRuntimeController = createViewerRuntimeController({
  pc,
  firstPreset,
  runtimeWindow: window,
  runtimeDocument: document,
  longTaskBuffer,
  getActiveRouteId: () => activeRouteId,
  getActiveSuiteRunId: () => activeSuiteRunId,
  getActiveRenderScalePercent: () => activeRenderScalePercent,
  getActiveSceneLook: () => activeSceneLook,
  getVariantBenchmark,
  publishVariantBenchmark,
  createBenchmark: (variantId) =>
    beginStoredVariantBenchmark(variantBenchmarks, variantId),
  getRouteSummaryText: () => routeSummaryText,
  setRouteSummaryText: (summaryText) => {
    routeSummaryText = summaryText;
  },
  clearActiveRoute: () => {
    activeRouteId = null;
  },
  updateRouteButtons,
  publishRouteControls,
  finalizeRouteRunRecord,
  renderCameraMeta,
  renderPerfHud,
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
    useViewerUiStore.getState().setStatus({
      title,
      detail,
    });
  },
  publishRouteControls,
  updateRouteButtons,
  setVariantButtonsDisabled,
  activateVariant,
  startBenchmarkRoute,
  stopActiveBenchmarkRoute,
});
const viewerShellController = createViewerShellController({
  showPerfHud,
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
    const presetPanel = useViewerUiStore.getState().presetPanel;
    if (!presetPanel) {
      return;
    }

    useViewerUiStore.getState().setPresetPanel({
      ...presetPanel,
      summary,
    });
  },
  setStatus: (title, detail) => {
    useViewerUiStore.getState().setStatus({
      title,
      detail,
    });
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
  activatePreset: (presetId) => activatePreset(presetId),
  activateVariant: (variantId) => activateVariant(variantId),
  activateBenchmarkRoute,
  runCurrentVariantRouteBenchmark,
  runRouteBenchmarkSuite,
  copyLatestRouteAnalysisSummary: () =>
    routeDiagnosticsController.copyLatestRouteAnalysis("summary"),
  copyLatestRouteAnalysisJson: () =>
    routeDiagnosticsController.copyLatestRouteAnalysis("json"),
  downloadLatestRouteAnalysisJson: () =>
    routeDiagnosticsController.downloadLatestRouteAnalysisJson(),
  activateRenderScale,
  applySceneLook: (sceneLook) => applySceneLook(sceneLook),
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
  setStatus: (title, detail) => {
    useViewerUiStore.getState().setStatus({
      title,
      detail,
    });
  },
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
  persistRenderScalePercent(window, normalizedPercent);
  renderRenderScaleMeta(normalizedPercent);
  applyRenderScaleToRuntime(runtime, normalizedPercent, maxRenderScalePercent);
  renderPerfHud(runtime);
}

function renderRenderScaleMeta(percent) {
  viewerShellController.renderRenderScaleMeta(percent);
}

function applySceneLook(sceneLook) {
  const nextSceneLook = normalizeSceneLookSettings(sceneLook);
  activeSceneLook = nextSceneLook;
  persistSceneLookSettings(window, nextSceneLook);
  renderSceneLookMeta(nextSceneLook);
  applyRuntimeSceneLook(runtime, nextSceneLook);
}

function renderSceneLookMeta(sceneLook) {
  useViewerUiStore.getState().setSceneLook({
    summary: formatSceneLookSummary(sceneLook),
    brightnessPercent: sceneLook.brightnessPercent,
    contrastPercent: sceneLook.contrastPercent,
    saturationPercent: sceneLook.saturationPercent,
    brightnessValue: `${sceneLook.brightnessPercent}%`,
    contrastValue: `${sceneLook.contrastPercent}%`,
    saturationValue: `${sceneLook.saturationPercent}%`,
  });
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
  return viewerRuntimeController.createRuntime(
    canvasElement,
    variant,
    timings,
    sceneLook,
  );
}

function moveCamera(runtimeState, preset, immediate = false) {
  viewerRuntimeController.moveCamera(runtimeState, preset, immediate);
}

function startBenchmarkRoute(runtimeState, route, options: any = {}) {
  viewerRuntimeController.startBenchmarkRoute(runtimeState, route, options);
}

function stopActiveBenchmarkRoute(summaryText = "未播放", status = "aborted") {
  viewerRuntimeController.stopActiveBenchmarkRoute(runtime, summaryText, status);
}

function advanceBenchmarkRoute(runtimeState) {
  return viewerRuntimeController.advanceBenchmarkRoute(runtimeState);
}

function updateBenchmarkRoute(runtimeState, dt) {
  return viewerRuntimeController.updateBenchmarkRoute(runtimeState, dt);
}

function captureCurrentView(runtimeState) {
  return viewerRuntimeController.captureCurrentView(runtimeState);
}

function restoreCurrentView(runtimeState, snapshot) {
  return viewerRuntimeController.restoreCurrentView(runtimeState, snapshot);
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

function renderCameraMeta(runtimeState) {
  viewerShellController.renderCameraMeta(runtimeState);
}

function renderPerfHud(runtimeState) {
  viewerShellController.renderPerfHud(runtimeState);
}
