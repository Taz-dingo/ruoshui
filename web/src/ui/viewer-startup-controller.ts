import type { SceneLookSettings } from "../runtime/scene-look";
import type { ViewerVariant } from "../types";
import { useViewerUiStore } from "./viewer-ui-store";

interface InstallViewerStartupBindingsArgs {
  focusSceneButton: HTMLButtonElement;
  focusOverviewButton: HTMLButtonElement;
  firstPresetId: string;
  activatePreset: (presetId: string) => void;
  activateVariant: (variantId: string) => void | Promise<unknown>;
  activateBenchmarkRoute: (routeId: string) => void;
  runCurrentVariantRouteBenchmark: () => void | Promise<unknown>;
  runRouteBenchmarkSuite: () => void | Promise<unknown>;
  copyRouteAnalysisSummaryButton: HTMLButtonElement;
  copyRouteAnalysisJsonButton: HTMLButtonElement;
  downloadRouteAnalysisJsonButton: HTMLButtonElement;
  copyLatestRouteAnalysisSummary: () => void | Promise<unknown>;
  copyLatestRouteAnalysisJson: () => void | Promise<unknown>;
  downloadLatestRouteAnalysisJson: () => void;
  renderScaleSlider: HTMLInputElement;
  activateRenderScale: (nextPercent: number) => void;
  sceneLookInputs: HTMLInputElement[];
  applySceneLookFromControls: () => void;
  inspectorToggles: HTMLButtonElement[];
  getOpenInspectorPanel: () => string | null;
  setOpenInspectorPanel: (panelId: string | null) => void;
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
  openInspectorPanel: string | null;
  setOpenInspectorPanel: (panelId: string | null) => void;
  statusTitle: HTMLElement;
  statusDetail: HTMLElement;
}

function installViewerStartupBindings({
  focusSceneButton,
  focusOverviewButton,
  firstPresetId,
  activatePreset,
  activateVariant,
  activateBenchmarkRoute,
  runCurrentVariantRouteBenchmark,
  runRouteBenchmarkSuite,
  copyRouteAnalysisSummaryButton,
  copyRouteAnalysisJsonButton,
  downloadRouteAnalysisJsonButton,
  copyLatestRouteAnalysisSummary,
  copyLatestRouteAnalysisJson,
  downloadLatestRouteAnalysisJson,
  renderScaleSlider,
  activateRenderScale,
  sceneLookInputs,
  applySceneLookFromControls,
  inspectorToggles,
  getOpenInspectorPanel,
  setOpenInspectorPanel,
}: InstallViewerStartupBindingsArgs) {
  let lastVariantSelectionSequence =
    useViewerUiStore.getState().variantSelectionRequest.sequence;
  let lastPresetSelectionSequence =
    useViewerUiStore.getState().presetSelectionRequest.sequence;
  let lastRouteSelectionSequence =
    useViewerUiStore.getState().routeSelectionRequest.sequence;
  let lastRunCurrentRouteBenchmarkRequest =
    useViewerUiStore.getState().runCurrentRouteBenchmarkRequest;
  let lastRunRouteSuiteRequest = useViewerUiStore.getState().runRouteSuiteRequest;

  const handleFocusScene = () => {
    activatePreset(firstPresetId);
  };
  const handleFocusOverview = () => {
    activatePreset("hover");
  };
  const handleCopyRouteAnalysisSummary = () => {
    void copyLatestRouteAnalysisSummary();
  };
  const handleCopyRouteAnalysisJson = () => {
    void copyLatestRouteAnalysisJson();
  };
  const handleDownloadRouteAnalysisJson = () => {
    downloadLatestRouteAnalysisJson();
  };
  const handleRenderScaleInput = (event: Event) => {
    const nextPercent = Number((event.currentTarget as HTMLInputElement).value);
    activateRenderScale(nextPercent);
  };
  const handleInspectorToggle = (toggle: HTMLButtonElement) => () => {
    const { toggle: panelId } = toggle.dataset;
    if (!panelId) {
      return;
    }

    setOpenInspectorPanel(getOpenInspectorPanel() === panelId ? null : panelId);
  };

  focusSceneButton.addEventListener("click", handleFocusScene);
  focusOverviewButton.addEventListener("click", handleFocusOverview);
  copyRouteAnalysisSummaryButton.addEventListener(
    "click",
    handleCopyRouteAnalysisSummary,
  );
  copyRouteAnalysisJsonButton.addEventListener("click", handleCopyRouteAnalysisJson);
  downloadRouteAnalysisJsonButton.addEventListener(
    "click",
    handleDownloadRouteAnalysisJson,
  );
  renderScaleSlider.addEventListener("input", handleRenderScaleInput);
  for (const input of sceneLookInputs) {
    input.addEventListener("input", applySceneLookFromControls);
  }

  const inspectorToggleHandlers = new Map<HTMLButtonElement, () => void>();
  for (const toggle of inspectorToggles) {
    const handler = handleInspectorToggle(toggle);
    inspectorToggleHandlers.set(toggle, handler);
    toggle.addEventListener("click", handler);
  }

  const unsubscribe = useViewerUiStore.subscribe((state) => {
    const {
      presetSelectionRequest,
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
      focusSceneButton.removeEventListener("click", handleFocusScene);
      focusOverviewButton.removeEventListener("click", handleFocusOverview);
      copyRouteAnalysisSummaryButton.removeEventListener(
        "click",
        handleCopyRouteAnalysisSummary,
      );
      copyRouteAnalysisJsonButton.removeEventListener(
        "click",
        handleCopyRouteAnalysisJson,
      );
      downloadRouteAnalysisJsonButton.removeEventListener(
        "click",
        handleDownloadRouteAnalysisJson,
      );
      renderScaleSlider.removeEventListener("input", handleRenderScaleInput);
      for (const input of sceneLookInputs) {
        input.removeEventListener("input", applySceneLookFromControls);
      }
      for (const [toggle, handler] of inspectorToggleHandlers) {
        toggle.removeEventListener("click", handler);
      }
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
  openInspectorPanel,
  setOpenInspectorPanel,
  statusTitle,
  statusDetail,
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
  setOpenInspectorPanel(openInspectorPanel);
  statusTitle.textContent = "加载中";
  statusDetail.textContent = "准备场景资源";
}

export {
  initializeViewerStartup,
  installViewerStartupBindings,
};
