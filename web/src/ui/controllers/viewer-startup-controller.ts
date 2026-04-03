import type { SceneLookSettings } from '../../runtime/scene-look';
import type { PostProcessingSettings } from '../../runtime/postprocessing';
import type { ViewerVariant } from '../../content/types';
import {
  subscribeViewerCommands,
  type ViewerCommand
} from '../commands/viewer-command-bus';

interface InstallViewerStartupBindingsArgs {
  activatePreset: (presetId: string) => void;
  activateVariant: (variantId: string) => void | Promise<unknown>;
  activateBenchmarkRoute: (routeId: string) => void;
  runCurrentVariantRouteBenchmark: () => void | Promise<unknown>;
  runRouteBenchmarkSuite: () => void | Promise<unknown>;
  captureHighlightPoint: (clientX: number, clientY: number) => void;
  copyHighlightDraft: () => void | Promise<unknown>;
  copyLatestRouteAnalysisSummary: () => void | Promise<unknown>;
  copyLatestRouteAnalysisJson: () => void | Promise<unknown>;
  downloadLatestRouteAnalysisJson: () => void;
  activateRenderScale: (nextPercent: number) => void;
  setAntiAliasEnabled: (enabled: boolean) => void;
  applySceneLook: (sceneLook: SceneLookSettings) => void;
  setHighlightAuthoringEnabled: (enabled: boolean) => void;
  setHighlightPlaneY: (value: number) => void;
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
  activePostProcessing: PostProcessingSettings;
  renderSceneLookMeta: (sceneLook: SceneLookSettings) => void;
  activeSceneLook: SceneLookSettings;
  renderCameraMeta: (runtimeState: any) => void;
  renderHighlightOverlay: (runtimeState: any) => void;
  renderPerfHud: (runtimeState: any) => void;
  publishRouteDiagnostics: () => void;
  installRouteAnalysisBridge: () => void;
  setLoading: (mode: 'boot' | 'switch') => void;
  setStatus: (title: string, detail: string) => void;
}

function installViewerStartupBindings({
  activatePreset,
  activateVariant,
  activateBenchmarkRoute,
  runCurrentVariantRouteBenchmark,
  runRouteBenchmarkSuite,
  captureHighlightPoint,
  copyHighlightDraft,
  copyLatestRouteAnalysisSummary,
  copyLatestRouteAnalysisJson,
  downloadLatestRouteAnalysisJson,
  activateRenderScale,
  setAntiAliasEnabled,
  applySceneLook,
  setHighlightAuthoringEnabled,
  setHighlightPlaneY
}: InstallViewerStartupBindingsArgs) {
  const unsubscribe = subscribeViewerCommands((command: ViewerCommand) => {
    switch (command.type) {
      case 'select-preset':
        activatePreset(command.presetId);
        return;
      case 'select-variant':
        void activateVariant(command.variantId);
        return;
      case 'select-route':
        activateBenchmarkRoute(command.routeId);
        return;
      case 'copy-route-analysis-summary':
        void copyLatestRouteAnalysisSummary();
        return;
      case 'copy-route-analysis-json':
        void copyLatestRouteAnalysisJson();
        return;
      case 'copy-highlight-draft':
        void copyHighlightDraft();
        return;
      case 'capture-highlight-point':
        captureHighlightPoint(command.clientX, command.clientY);
        return;
      case 'download-route-analysis-json':
        downloadLatestRouteAnalysisJson();
        return;
      case 'set-render-scale':
        activateRenderScale(command.value);
        return;
      case 'set-anti-alias':
        setAntiAliasEnabled(command.enabled);
        return;
      case 'set-scene-look':
        applySceneLook({
          brightnessPercent: command.brightnessPercent,
          contrastPercent: command.contrastPercent,
          saturationPercent: command.saturationPercent
        });
        return;
      case 'set-highlight-authoring-enabled':
        setHighlightAuthoringEnabled(command.enabled);
        return;
      case 'set-highlight-plane-y':
        setHighlightPlaneY(command.value);
        return;
      case 'run-current-route-benchmark':
        void runCurrentVariantRouteBenchmark();
        return;
      case 'run-route-suite':
        void runRouteBenchmarkSuite();
        return;
      default:
        return;
    }
  });

  return {
    destroy() {
      unsubscribe();
    }
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
  activePostProcessing,
  renderSceneLookMeta,
  activeSceneLook,
  renderCameraMeta,
  renderHighlightOverlay,
  renderPerfHud,
  publishRouteDiagnostics,
  installRouteAnalysisBridge,
  setLoading,
  setStatus
}: InitializeViewerStartupArgs) {
  updatePresetButtons();
  updateVariantButtons();
  updateRouteButtons();
  publishRouteControls();
  renderVariantMeta(defaultVariant);
  renderRenderScaleMeta(activeRenderScalePercent);
  void activePostProcessing;
  renderSceneLookMeta(activeSceneLook);
  renderCameraMeta(null);
  renderHighlightOverlay(null);
  renderPerfHud(null);
  publishRouteDiagnostics();
  installRouteAnalysisBridge();
  setLoading('boot');
  setStatus('加载中', '准备场景资源');
}

export {
  initializeViewerStartup,
  installViewerStartupBindings
};
