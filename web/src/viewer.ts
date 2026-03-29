import { createRouteDiagnosticsController } from './benchmark/diagnostics-controller';
import { getInitialRouteRunHistory } from './benchmark/history';
import { createRouteBenchmarkController } from './benchmark/route-benchmark-controller';
import {
  beginStoredVariantBenchmark,
  getStoredVariantBenchmark,
  initLongTaskObserver
} from './benchmark/runtime';
import {
  currentVariantRepeatCount,
  frameSampleIndices,
  maxRouteRunHistory,
  routeAnalysisCopyFeedbackMs,
  routeRunHistoryStorageKey
} from './config';
import {
  applyRenderScaleToRuntime,
  normalizeRenderScalePercent,
  persistRenderScalePercent
} from './performance/render-scale';
import {
  applyRuntimeSceneLook,
  formatSceneLookSummary,
  loadSceneLookSettings,
  normalizeSceneLookSettings,
  persistSceneLookSettings
} from './runtime/scene-look';
import { createViewerSessionState } from './runtime/viewer-session-state';
import { createVariantOrchestrationController } from './runtime/variant-orchestration';
import { createViewerRuntimeController } from './runtime/viewer-runtime-controller';
import type { RouteRunRecord, VariantBenchmark, ViewerContent } from './types';
import { createViewerPanelController } from './ui/viewer-panel-controller';
import {
  initializeViewerStartup,
  installViewerStartupBindings
} from './ui/viewer-startup-controller';
import { createViewerShellController } from './ui/viewer-shell-controller';
import { useViewerUiStore } from './ui/viewer-ui-store';
import type { ViewerConfig } from './viewer-config';

interface InitializeViewerArgs {
  data: ViewerContent;
  sceneContainer: HTMLDivElement;
  viewerConfig: ViewerConfig;
}

const playCanvasPromise: Promise<any> = import(
  /* @vite-ignore */ 'https://esm.sh/playcanvas@2.17.2?bundle'
);

async function initializeViewer({
  data,
  sceneContainer,
  viewerConfig
}: InitializeViewerArgs) {
  const pc = await playCanvasPromise;
  const initialSceneLook = loadSceneLookSettings(window);
  const session = createViewerSessionState({
    defaultVariantId: viewerConfig.defaultVariant.id,
    firstPresetId: viewerConfig.firstPreset.id,
    initialRenderScalePercent: viewerConfig.activeRenderScalePercent,
    initialSceneLook,
    initialSelectedRouteId: viewerConfig.benchmarkRoutes[0]?.id ?? null
  });

  const longTaskBuffer: Array<{ startTime: number; duration: number }> = [];
  const variantBenchmarks = new Map<string, VariantBenchmark>();
  const routeRunHistory: RouteRunRecord[] = getInitialRouteRunHistory(
    routeRunHistoryStorageKey,
    maxRouteRunHistory
  );

  initLongTaskObserver(longTaskBuffer);

  const viewerPanelController = createViewerPanelController({
    variants: data.variants,
    defaultVariant: viewerConfig.defaultVariant,
    presets: data.presets,
    firstPreset: viewerConfig.firstPreset,
    benchmarkRoutes: viewerConfig.benchmarkRoutes,
    variantCount: data.variants.length,
    currentVariantRepeatCount,
    getActiveVariantId: session.getActiveVariantId,
    getActivePresetId: session.getActivePresetId,
    getSelectedRouteId: session.getSelectedRouteId,
    getActiveRouteId: session.getActiveRouteId,
    getRouteSummaryText: session.getRouteSummaryText,
    getIsBatchBenchmarkRunning: session.getIsBatchBenchmarkRunning,
    getIsVariantPanelDisabled: session.getIsVariantPanelDisabled,
    setIsVariantPanelDisabled: session.setIsVariantPanelDisabled
  });

  const viewerShellController = createViewerShellController({
    showPerfHud: viewerConfig.showPerfHud,
    publishVariantPanel,
    getVariantBenchmark,
    getActiveVariantId: session.getActiveVariantId,
    getActiveRenderScalePercent: session.getActiveRenderScalePercent
  });

  const viewerRuntimeController = createViewerRuntimeController({
    pc,
    firstPreset: viewerConfig.firstPreset,
    runtimeWindow: window,
    runtimeDocument: document,
    longTaskBuffer,
    getActiveRouteId: session.getActiveRouteId,
    getActiveSuiteRunId: session.getActiveSuiteRunId,
    getActiveRenderScalePercent: session.getActiveRenderScalePercent,
    getActiveSceneLook: session.getActiveSceneLook,
    getVariantBenchmark,
    publishVariantBenchmark,
    createBenchmark: createVariantBenchmark,
    getRouteSummaryText: session.getRouteSummaryText,
    setRouteSummaryText: session.setRouteSummaryText,
    clearActiveRoute: () => session.setActiveRouteId(null),
    updateRouteButtons,
    publishRouteControls,
    finalizeRouteRunRecord,
    renderCameraMeta,
    renderPerfHud
  });

  const routeDiagnosticsController = createRouteDiagnosticsController({
    frameSchema: Object.keys(frameSampleIndices),
    copyFeedbackMs: routeAnalysisCopyFeedbackMs,
    maxRouteRunHistory,
    routeRunHistoryStorageKey,
    routeRunHistory,
    longTaskBuffer,
    benchmarkRoutes: viewerConfig.benchmarkRoutes,
    variants: data.variants,
    getRouteStepLabel: (routeId, stepIndex) => {
      const route = routeId
        ? viewerConfig.benchmarkRoutesById.get(routeId)
        : null;
      const totalSteps = route?.steps?.length ?? null;
      const ordinal = Number.isFinite(stepIndex) ? stepIndex + 1 : 0;

      return totalSteps ? `Step ${ordinal}/${totalSteps}` : `Step ${ordinal}`;
    },
    getActiveBenchmarkRunPromise: session.getActiveBenchmarkRunPromise,
    runVariantRouteBenchmark: (options) => runVariantRouteBenchmark(options)
  });

  const routeBenchmarkController = createRouteBenchmarkController({
    benchmarkRoutes: viewerConfig.benchmarkRoutes,
    benchmarkRoutesById: viewerConfig.benchmarkRoutesById,
    variants: data.variants,
    variantsById: viewerConfig.variantsById,
    currentVariantRepeatCount,
    frameSchema: Object.keys(frameSampleIndices),
    routeRunHistory,
    getRuntime: session.getRuntime,
    getSelectedRouteId: session.getSelectedRouteId,
    setSelectedRouteId: session.setSelectedRouteId,
    getActiveRouteId: session.getActiveRouteId,
    setActiveRouteId: session.setActiveRouteId,
    getActiveVariantId: session.getActiveVariantId,
    getIsBatchBenchmarkRunning: session.getIsBatchBenchmarkRunning,
    setIsBatchBenchmarkRunning: session.setIsBatchBenchmarkRunning,
    setActiveSuiteRunId: session.setActiveSuiteRunId,
    setActiveBenchmarkRunPromise: session.setActiveBenchmarkRunPromise,
    setRouteSummaryText: session.setRouteSummaryText,
    setStatus: setUiStatus,
    publishRouteControls,
    updateRouteButtons,
    setVariantButtonsDisabled,
    activateVariant,
    startBenchmarkRoute,
    stopActiveBenchmarkRoute
  });

  const variantOrchestrationController = createVariantOrchestrationController({
    pc,
    presets: data.presets,
    variantsById: viewerConfig.variantsById,
    sceneContainer,
    getRuntime: session.getRuntime,
    setRuntime: session.setRuntime,
    getActiveVariantId: session.getActiveVariantId,
    setActiveVariantId: session.setActiveVariantId,
    getActivePresetId: session.getActivePresetId,
    setActivePresetId: session.setActivePresetId,
    getActiveRouteId: session.getActiveRouteId,
    getSceneLook: session.getActiveSceneLook,
    issueLoadToken: session.issueLoadToken,
    isCurrentLoadToken: session.isCurrentLoadToken,
    createBenchmark: createVariantBenchmark,
    renderVariantMeta: viewerShellController.renderVariantMeta,
    updateVariantButtons,
    updatePresetButtons,
    setVariantButtonsDisabled,
    setPresetSummary,
    setStatus: setUiStatus,
    stopActiveBenchmarkRoute,
    captureCurrentView,
    restoreCurrentView,
    createRuntime,
    moveCamera,
    publishVariantBenchmark,
    getVariantBenchmark
  });

  installViewerStartupBindings({
    activatePreset,
    activateVariant,
    activateBenchmarkRoute,
    runCurrentVariantRouteBenchmark,
    runRouteBenchmarkSuite,
    copyLatestRouteAnalysisSummary: () =>
      routeDiagnosticsController.copyLatestRouteAnalysis('summary'),
    copyLatestRouteAnalysisJson: () =>
      routeDiagnosticsController.copyLatestRouteAnalysis('json'),
    downloadLatestRouteAnalysisJson: () =>
      routeDiagnosticsController.downloadLatestRouteAnalysisJson(),
    activateRenderScale,
    applySceneLook
  });

  initializeViewerStartup({
    updatePresetButtons,
    updateVariantButtons,
    updateRouteButtons,
    publishRouteControls,
    renderVariantMeta: viewerShellController.renderVariantMeta,
    defaultVariant: viewerConfig.defaultVariant,
    renderRenderScaleMeta: viewerShellController.renderRenderScaleMeta,
    activeRenderScalePercent: session.getActiveRenderScalePercent(),
    renderSceneLookMeta,
    activeSceneLook: session.getActiveSceneLook(),
    renderCameraMeta,
    renderPerfHud,
    publishRouteDiagnostics: routeDiagnosticsController.publishRouteDiagnostics,
    installRouteAnalysisBridge: routeDiagnosticsController.installRouteAnalysisBridge,
    setStatus: setUiStatus
  });

  await activateVariant(viewerConfig.defaultVariant.id, true);

  function setUiStatus(title: string, detail: string) {
    useViewerUiStore.getState().setStatus({
      title,
      detail
    });
  }

  function setPresetSummary(summary: string) {
    const presetPanel = useViewerUiStore.getState().presetPanel;
    if (!presetPanel) {
      return;
    }

    useViewerUiStore.getState().setPresetPanel({
      ...presetPanel,
      summary
    });
  }

  function createVariantBenchmark(variantId: string) {
    return beginStoredVariantBenchmark(variantBenchmarks, variantId);
  }

  function activateRenderScale(nextPercent: number) {
    const normalizedPercent = normalizeRenderScalePercent(
      nextPercent,
      viewerConfig.maxRenderScalePercent
    );
    session.setActiveRenderScalePercent(normalizedPercent);
    persistRenderScalePercent(window, normalizedPercent);
    viewerShellController.renderRenderScaleMeta(normalizedPercent);
    applyRenderScaleToRuntime(
      session.getRuntime(),
      normalizedPercent,
      viewerConfig.maxRenderScalePercent
    );
    renderPerfHud(session.getRuntime());
  }

  function applySceneLook(sceneLook: ReturnType<typeof session.getActiveSceneLook>) {
    const nextSceneLook = normalizeSceneLookSettings(sceneLook);
    session.setActiveSceneLook(nextSceneLook);
    persistSceneLookSettings(window, nextSceneLook);
    renderSceneLookMeta(nextSceneLook);
    applyRuntimeSceneLook(session.getRuntime(), nextSceneLook);
  }

  function renderSceneLookMeta(
    sceneLook: ReturnType<typeof session.getActiveSceneLook>
  ) {
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

  async function activateVariant(
    variantId: string,
    initial = false,
    forceReload = false
  ) {
    return variantOrchestrationController.activateVariant(
      variantId,
      initial,
      forceReload
    );
  }

  function activatePreset(presetId: string, immediate = false) {
    variantOrchestrationController.activatePreset(presetId, immediate);
  }

  function activateBenchmarkRoute(routeId: string) {
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

  function setVariantButtonsDisabled(disabled: boolean) {
    viewerPanelController.setVariantButtonsDisabled(disabled);
  }

  function publishVariantPanel() {
    viewerPanelController.publishVariantPanel();
  }

  function publishRouteControls() {
    viewerPanelController.publishRouteControls();
  }

  async function createRuntime(
    canvasElement: HTMLCanvasElement,
    variant: (typeof data.variants)[number],
    timings: any = {},
    sceneLook = session.getActiveSceneLook()
  ) {
    return viewerRuntimeController.createRuntime(
      canvasElement,
      variant,
      timings,
      sceneLook
    );
  }

  function moveCamera(
    runtimeState: any,
    preset: (typeof data.presets)[number],
    immediate = false
  ) {
    viewerRuntimeController.moveCamera(runtimeState, preset, immediate);
  }

  function startBenchmarkRoute(runtimeState: any, route: any, options: any = {}) {
    viewerRuntimeController.startBenchmarkRoute(runtimeState, route, options);
  }

  function stopActiveBenchmarkRoute(
    summaryText = '未播放',
    status = 'aborted'
  ) {
    viewerRuntimeController.stopActiveBenchmarkRoute(
      session.getRuntime(),
      summaryText,
      status
    );
  }

  function captureCurrentView(runtimeState: any) {
    return viewerRuntimeController.captureCurrentView(runtimeState);
  }

  function restoreCurrentView(runtimeState: any, snapshot: any) {
    return viewerRuntimeController.restoreCurrentView(runtimeState, snapshot);
  }

  function finalizeRouteRunRecord(runtimeState: any, status: string) {
    return routeDiagnosticsController.finalizeRouteRunRecord(runtimeState, status);
  }

  function getVariantBenchmark(
    variantId: string | null | undefined
  ): VariantBenchmark | null {
    return getStoredVariantBenchmark(variantBenchmarks, variantId);
  }

  function publishVariantBenchmark(variantId: string) {
    if (variantId !== session.getActiveVariantId()) {
      return;
    }

    viewerShellController.renderVariantBenchmark(variantId);
  }

  function renderCameraMeta(runtimeState: any) {
    viewerShellController.renderCameraMeta(runtimeState);
  }

  function renderPerfHud(runtimeState: any) {
    viewerShellController.renderPerfHud(runtimeState);
  }
}

export {
  initializeViewer
};
