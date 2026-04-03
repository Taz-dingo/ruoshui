import { createRouteDiagnosticsController } from '../benchmark/diagnostics-controller';
import { getInitialRouteRunHistory } from '../benchmark/history';
import { createRouteBenchmarkController } from '../benchmark/route-benchmark-controller';
import {
  beginStoredVariantBenchmark,
  getStoredVariantBenchmark,
  initLongTaskObserver
} from '../benchmark/runtime';
import {
  currentVariantRepeatCount,
  frameSampleIndices,
  maxRouteRunHistory,
  routeAnalysisCopyFeedbackMs,
  routeRunHistoryStorageKey
} from '../config';
import {
  applyRenderScaleToRuntime,
  normalizeRenderScalePercent,
  persistRenderScalePercent
} from '../performance/render-scale';
import {
  applyRuntimePostProcessing,
  isAntiAliasSupported,
  loadPostProcessingSettings,
  normalizePostProcessingSettings,
  sanitizePostProcessingSettings,
  persistPostProcessingSettings
} from '../runtime/postprocessing';
import {
  applyRuntimeSceneLook,
  loadSceneLookSettings,
  normalizeSceneLookSettings,
  persistSceneLookSettings
} from '../runtime/scene-look';
import { captureHighlightDraft } from '../runtime/highlight-authoring';
import { createViewerSessionState } from '../runtime/viewer-session-state';
import { createVariantOrchestrationController } from '../runtime/variant-orchestration';
import { createViewerRuntimeController } from '../runtime/viewer-runtime-controller';
import type { RouteRunRecord, VariantBenchmark } from '../benchmark/types';
import { createViewerPanelController } from '../ui/controllers/viewer-panel-controller';
import {
  initializeViewerStartup,
  installViewerStartupBindings
} from '../ui/controllers/viewer-startup-controller';
import { createViewerShellController } from '../ui/controllers/viewer-shell-controller';
import {
  clearViewerLoading,
  setPresetPanelSummary,
  setViewerLoading,
  setViewerStatus,
  syncSceneLookState
} from '../ui/state/viewer-ui-sync';
import { useViewerUiStore } from '../ui/state/viewer-ui-store';
import { collectGraphicsBackendDiagnostics } from '../runtime/bootstrap';
import type { ViewerConfig } from './viewer-config';
import type { ViewerContent } from '../content/types';

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
  const gpuDiagnostics = await collectGraphicsBackendDiagnostics(pc, window);
  const initialSceneLook = loadSceneLookSettings(window);
  const initialPostProcessing = loadPostProcessingSettings(window);
  const session = createViewerSessionState({
    defaultVariantId: viewerConfig.defaultVariant.id,
    firstPresetId: viewerConfig.firstPreset.id,
    initialRenderScalePercent: viewerConfig.activeRenderScalePercent,
    initialSceneLook,
    initialPostProcessing,
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
  const {
    publishRouteControls,
    publishVariantPanel,
    setVariantButtonsDisabled,
    updatePresetButtons,
    updateRouteButtons,
    updateVariantButtons
  } = viewerPanelController;

  function createVariantBenchmark(variantId: string) {
    return beginStoredVariantBenchmark(variantBenchmarks, variantId);
  }

  function getVariantBenchmark(
    variantId: string | null | undefined
  ): VariantBenchmark | null {
    return getStoredVariantBenchmark(variantBenchmarks, variantId);
  }

  const viewerShellController = createViewerShellController({
    pc,
    highlights: data.highlights ?? [],
    showPerfHud: viewerConfig.showPerfHud,
    publishVariantPanel,
    getVariantBenchmark,
    getActivePostProcessing: session.getActivePostProcessing,
    getGraphicsBackend: () => session.getRuntime()?.graphicsBackend ?? null,
    getActiveVariantId: session.getActiveVariantId,
    getActiveRenderScalePercent: session.getActiveRenderScalePercent
  });
  const {
    renderCameraMeta,
    renderHighlightOverlay,
    renderPerfHud,
    renderRenderScaleMeta,
    renderVariantBenchmark,
    renderVariantMeta
  } = viewerShellController;

  const viewerRuntimeController = createViewerRuntimeController({
    pc,
    firstPreset: viewerConfig.firstPreset,
    runtimeWindow: window,
    runtimeDocument: document,
    longTaskBuffer,
    gpuDiagnostics,
    getActiveRouteId: session.getActiveRouteId,
    getActiveSuiteRunId: session.getActiveSuiteRunId,
    getActiveRenderScalePercent: session.getActiveRenderScalePercent,
    getActiveSceneLook: session.getActiveSceneLook,
    getActivePostProcessing: session.getActivePostProcessing,
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
    renderHighlightOverlay,
    renderPerfHud,
    setStatus: setViewerStatus
  });
  const {
    captureCurrentView,
    createRuntime,
    moveCamera,
    restoreCurrentView,
    startBenchmarkRoute,
    stopActiveBenchmarkRoute
  } = viewerRuntimeController;

  async function runVariantRouteBenchmark(options: any = {}) {
    return routeBenchmarkController.runVariantRouteBenchmark(options);
  }

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
    setStatus: setViewerStatus,
    publishRouteControls,
    updateRouteButtons,
    setVariantButtonsDisabled,
    activateVariant,
    startBenchmarkRoute,
    stopActiveBenchmarkRoute
  });
  const {
    activateBenchmarkRoute,
    runCurrentVariantRouteBenchmark,
    runRouteBenchmarkSuite
  } = routeBenchmarkController;

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
    setPresetSummary: setPresetPanelSummary,
    setLoading: setViewerLoading,
    clearLoading: clearViewerLoading,
    setStatus: setViewerStatus,
    stopActiveBenchmarkRoute,
    captureCurrentView,
    restoreCurrentView,
    createRuntime,
    moveCamera,
    publishVariantBenchmark,
    getVariantBenchmark,
    onRuntimeReady: (runtimeState) => {
      const sanitizedPostProcessing = sanitizePostProcessingSettings(
        session.getActivePostProcessing(),
        runtimeState?.graphicsBackend
      );
      session.setActivePostProcessing(sanitizedPostProcessing);
      persistPostProcessingSettings(window, sanitizedPostProcessing);
      renderRenderScaleMeta(session.getActiveRenderScalePercent());
    }
  });
  const { activatePreset } = variantOrchestrationController;

  let highlightAuthoringEnabled = false;
  let highlightPlaneY = 0.08;

  function publishHighlightAuthoringState(overrides: Partial<{
    copyNote: string;
    jsonSnippet: string;
    note: string;
    point: string;
    pointPosition: [number, number, number] | null;
  }> = {}) {
    const currentState = useViewerUiStore.getState().highlightAuthoring;
    useViewerUiStore.getState().setHighlightAuthoring({
      ...currentState,
      isEnabled: highlightAuthoringEnabled,
      planeY: highlightPlaneY,
      planeYValue: highlightPlaneY.toFixed(2),
      summary: highlightAuthoringEnabled
        ? `打点中 · y=${highlightPlaneY.toFixed(2)}`
        : currentState.jsonSnippet
          ? '已生成草稿'
          : '关闭',
      ...overrides
    });
  }

  function setHighlightAuthoringEnabled(enabled: boolean) {
    highlightAuthoringEnabled = enabled;
    publishHighlightAuthoringState({
      note: enabled
        ? '点击场景记录一个近似落点；当前用水平参考平面估算。'
        : useViewerUiStore.getState().highlightAuthoring.note
    });
    session.getRuntime()?.requestRender?.();
  }

  function setHighlightPlaneY(value: number) {
    highlightPlaneY = Number(value.toFixed(2));
    publishHighlightAuthoringState();
    session.getRuntime()?.requestRender?.();
  }

  function captureHighlightPoint(clientX: number, clientY: number) {
    const runtimeState = session.getRuntime();
    const draft = captureHighlightDraft({
      pc,
      runtimeState,
      clientX,
      clientY,
      planeY: highlightPlaneY,
      presetId: session.getActivePresetId()
    });

    if (!draft) {
      publishHighlightAuthoringState({
        note: '当前没有可用运行时，或点击落在场景区域外。',
        copyNote: '请先进入打点模式，再点击场景。'
      });
      return;
    }

    publishHighlightAuthoringState({
      point: draft.pointText,
      pointPosition: draft.point,
      note: draft.note,
      jsonSnippet: draft.jsonSnippet,
      copyNote: '已生成草稿，可直接复制到内容配置。'
    });
    runtimeState?.requestRender?.();
  }

  async function copyHighlightDraft() {
    const draft = useViewerUiStore.getState().highlightAuthoring.jsonSnippet;
    if (!draft) {
      publishHighlightAuthoringState({
        copyNote: '还没有草稿可复制。'
      });
      return;
    }

    await navigator.clipboard.writeText(draft);
    publishHighlightAuthoringState({
      copyNote: '已复制到剪贴板。'
    });
  }

  installViewerStartupBindings({
    activatePreset,
    activateVariant,
    activateBenchmarkRoute,
    runCurrentVariantRouteBenchmark,
    runRouteBenchmarkSuite,
    captureHighlightPoint,
    copyHighlightDraft,
    copyLatestRouteAnalysisSummary: () =>
      routeDiagnosticsController.copyLatestRouteAnalysis('summary'),
    copyLatestRouteAnalysisJson: () =>
      routeDiagnosticsController.copyLatestRouteAnalysis('json'),
    downloadLatestRouteAnalysisJson: () =>
      routeDiagnosticsController.downloadLatestRouteAnalysisJson(),
    activateRenderScale,
    setAntiAliasEnabled,
    applySceneLook,
    setHighlightAuthoringEnabled,
    setHighlightPlaneY
  });

  initializeViewerStartup({
    updatePresetButtons,
    updateVariantButtons,
    updateRouteButtons,
    publishRouteControls,
    renderVariantMeta,
    defaultVariant: viewerConfig.defaultVariant,
    renderRenderScaleMeta,
    activeRenderScalePercent: session.getActiveRenderScalePercent(),
    activePostProcessing: session.getActivePostProcessing(),
    renderSceneLookMeta: syncSceneLookState,
    activeSceneLook: session.getActiveSceneLook(),
    renderCameraMeta,
    renderHighlightOverlay,
    renderPerfHud,
    publishRouteDiagnostics: routeDiagnosticsController.publishRouteDiagnostics,
    installRouteAnalysisBridge: routeDiagnosticsController.installRouteAnalysisBridge,
    setLoading: setViewerLoading,
    setStatus: setViewerStatus
  });
  publishHighlightAuthoringState();

  await activateVariant(viewerConfig.defaultVariant.id, true);

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

  function finalizeRouteRunRecord(runtimeState: any, status: string) {
    return routeDiagnosticsController.finalizeRouteRunRecord(runtimeState, status);
  }

  function activateRenderScale(nextPercent: number) {
    const normalizedPercent = normalizeRenderScalePercent(
      nextPercent,
      viewerConfig.maxRenderScalePercent
    );
    session.setActiveRenderScalePercent(normalizedPercent);
    persistRenderScalePercent(window, normalizedPercent);
    renderRenderScaleMeta(normalizedPercent);
    applyRenderScaleToRuntime(
      session.getRuntime(),
      normalizedPercent,
      viewerConfig.maxRenderScalePercent
    );
    renderPerfHud(session.getRuntime());
  }

  function setAntiAliasEnabled(enabled: boolean) {
    const graphicsBackend = session.getRuntime()?.graphicsBackend ?? null;
    if (!isAntiAliasSupported(graphicsBackend)) {
      const sanitizedPostProcessing = sanitizePostProcessingSettings(
        session.getActivePostProcessing(),
        graphicsBackend
      );
      session.setActivePostProcessing(sanitizedPostProcessing);
      persistPostProcessingSettings(window, sanitizedPostProcessing);
      useViewerUiStore.getState().setRenderScale({
        ...useViewerUiStore.getState().renderScale,
        antiAliasEnabled: sanitizedPostProcessing.fxaaEnabled,
        antiAliasAvailable: false,
        antiAliasSummary: '关闭',
        antiAliasNote: '当前暂未开放'
      });
      applyRenderScaleToRuntime(
        session.getRuntime(),
        session.getActiveRenderScalePercent(),
        viewerConfig.maxRenderScalePercent
      );
      renderPerfHud(session.getRuntime());
      return;
    }

    const nextPostProcessing = normalizePostProcessingSettings({
      ...session.getActivePostProcessing(),
      fxaaEnabled: enabled
    });
    session.setActivePostProcessing(nextPostProcessing);
    persistPostProcessingSettings(window, nextPostProcessing);
    renderRenderScaleMeta(session.getActiveRenderScalePercent());
    applyRuntimePostProcessing(pc, session.getRuntime(), nextPostProcessing);
    applyRenderScaleToRuntime(
      session.getRuntime(),
      session.getActiveRenderScalePercent(),
      viewerConfig.maxRenderScalePercent
    );
    renderPerfHud(session.getRuntime());
  }

  function applySceneLook(sceneLook: ReturnType<typeof session.getActiveSceneLook>) {
    const nextSceneLook = normalizeSceneLookSettings(sceneLook);
    session.setActiveSceneLook(nextSceneLook);
    persistSceneLookSettings(window, nextSceneLook);
    syncSceneLookState(nextSceneLook);
    applyRuntimeSceneLook(session.getRuntime(), nextSceneLook);
  }

  function publishVariantBenchmark(variantId: string) {
    if (variantId !== session.getActiveVariantId()) {
      return;
    }

    renderVariantBenchmark(variantId);
  }
}

export {
  initializeViewer
};
