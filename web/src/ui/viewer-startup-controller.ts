import type { SceneLookSettings } from "../runtime/scene-look";
import type { ViewerVariant } from "../types";
import { useViewerUiStore } from "./viewer-ui-store";

interface InstallViewerStartupBindingsArgs {
  activatePreset: (presetId: string) => void;
  activateVariant: (variantId: string) => void | Promise<unknown>;
  activateBenchmarkRoute: (routeId: string) => void;
  runCurrentVariantRouteBenchmark: () => void | Promise<unknown>;
  runRouteBenchmarkSuite: () => void | Promise<unknown>;
  copyLatestRouteAnalysisSummary: () => void | Promise<unknown>;
  copyLatestRouteAnalysisJson: () => void | Promise<unknown>;
  downloadLatestRouteAnalysisJson: () => void;
  activateRenderScale: (nextPercent: number) => void;
  applySceneLook: (sceneLook: SceneLookSettings) => void;
}

interface InitializeViewerStartupArgs {
  updatePresetButtons: () => void;
  updateVariantButtons: () => void;
  updateRouteButtons: () => void;
  publishRouteControls: () => void;
  renderVariantMeta: (variant: ViewerVariant) => void;
  defaultVariant: ViewerVariant;
  renderRenderScaleMeta: (percent: number) => void;
  activeRenderScalePercent: number;
  renderSceneLookMeta: (sceneLook: SceneLookSettings) => void;
  activeSceneLook: SceneLookSettings;
  renderCameraMeta: (runtimeState: any) => void;
  renderPerfHud: (runtimeState: any) => void;
  publishRouteDiagnostics: () => void;
  installRouteAnalysisBridge: () => void;
  setStatus: (title: string, detail: string) => void;
}

function installViewerStartupBindings({
  activatePreset,
  activateVariant,
  activateBenchmarkRoute,
  runCurrentVariantRouteBenchmark,
  runRouteBenchmarkSuite,
  copyLatestRouteAnalysisSummary,
  copyLatestRouteAnalysisJson,
  downloadLatestRouteAnalysisJson,
  activateRenderScale,
  applySceneLook,
}: InstallViewerStartupBindingsArgs) {
  let lastVariantSelectionSequence =
    useViewerUiStore.getState().variantSelectionRequest.sequence;
  let lastPresetSelectionSequence =
    useViewerUiStore.getState().presetSelectionRequest.sequence;
  let lastRouteSelectionSequence =
    useViewerUiStore.getState().routeSelectionRequest.sequence;
  let lastCopyRouteAnalysisJsonRequest =
    useViewerUiStore.getState().copyRouteAnalysisJsonRequest;
  let lastCopyRouteAnalysisSummaryRequest =
    useViewerUiStore.getState().copyRouteAnalysisSummaryRequest;
  let lastDownloadRouteAnalysisJsonRequest =
    useViewerUiStore.getState().downloadRouteAnalysisJsonRequest;
  let lastRenderScaleRequest = useViewerUiStore.getState().renderScaleRequest.sequence;
  let lastSceneLookRequest = useViewerUiStore.getState().sceneLookRequest.sequence;
  let lastRunCurrentRouteBenchmarkRequest =
    useViewerUiStore.getState().runCurrentRouteBenchmarkRequest;
  let lastRunRouteSuiteRequest = useViewerUiStore.getState().runRouteSuiteRequest;

  const unsubscribe = useViewerUiStore.subscribe((state) => {
    const {
      copyRouteAnalysisJsonRequest,
      copyRouteAnalysisSummaryRequest,
      downloadRouteAnalysisJsonRequest,
      presetSelectionRequest,
      renderScaleRequest,
      sceneLookRequest,
      variantSelectionRequest,
      routeSelectionRequest,
      runCurrentRouteBenchmarkRequest,
      runRouteSuiteRequest,
    } = state;

    if (presetSelectionRequest.sequence !== lastPresetSelectionSequence) {
      lastPresetSelectionSequence = presetSelectionRequest.sequence;
      if (presetSelectionRequest.id) {
        activatePreset(presetSelectionRequest.id);
      }
    }

    if (variantSelectionRequest.sequence !== lastVariantSelectionSequence) {
      lastVariantSelectionSequence = variantSelectionRequest.sequence;
      if (variantSelectionRequest.id) {
        void activateVariant(variantSelectionRequest.id);
      }
    }

    if (routeSelectionRequest.sequence !== lastRouteSelectionSequence) {
      lastRouteSelectionSequence = routeSelectionRequest.sequence;
      if (routeSelectionRequest.id) {
        activateBenchmarkRoute(routeSelectionRequest.id);
      }
    }

    if (copyRouteAnalysisSummaryRequest !== lastCopyRouteAnalysisSummaryRequest) {
      lastCopyRouteAnalysisSummaryRequest = copyRouteAnalysisSummaryRequest;
      void copyLatestRouteAnalysisSummary();
    }

    if (copyRouteAnalysisJsonRequest !== lastCopyRouteAnalysisJsonRequest) {
      lastCopyRouteAnalysisJsonRequest = copyRouteAnalysisJsonRequest;
      void copyLatestRouteAnalysisJson();
    }

    if (downloadRouteAnalysisJsonRequest !== lastDownloadRouteAnalysisJsonRequest) {
      lastDownloadRouteAnalysisJsonRequest = downloadRouteAnalysisJsonRequest;
      downloadLatestRouteAnalysisJson();
    }

    if (renderScaleRequest.sequence !== lastRenderScaleRequest) {
      lastRenderScaleRequest = renderScaleRequest.sequence;
      activateRenderScale(renderScaleRequest.value);
    }

    if (sceneLookRequest.sequence !== lastSceneLookRequest) {
      lastSceneLookRequest = sceneLookRequest.sequence;
      applySceneLook({
        brightnessPercent: sceneLookRequest.brightnessPercent,
        contrastPercent: sceneLookRequest.contrastPercent,
        saturationPercent: sceneLookRequest.saturationPercent,
      });
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

  return {
    destroy() {
      unsubscribe();
    },
  };
}

function initializeViewerStartup({
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
  publishRouteDiagnostics,
  installRouteAnalysisBridge,
  setStatus,
}: InitializeViewerStartupArgs) {
  updatePresetButtons();
  updateVariantButtons();
  updateRouteButtons();
  publishRouteControls();
  renderVariantMeta(defaultVariant);
  renderRenderScaleMeta(activeRenderScalePercent);
  renderSceneLookMeta(activeSceneLook);
  renderCameraMeta(null);
  renderPerfHud(null);
  publishRouteDiagnostics();
  installRouteAnalysisBridge();
  setStatus("加载中", "准备场景资源");
}

export {
  initializeViewerStartup,
  installViewerStartupBindings,
};
