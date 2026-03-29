import type { SceneLookSettings } from '../../runtime/scene-look';
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
  renderHighlightOverlay: (runtimeState: any) => void;
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
  applySceneLook
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
      case 'download-route-analysis-json':
        downloadLatestRouteAnalysisJson();
        return;
      case 'set-render-scale':
        activateRenderScale(command.value);
        return;
      case 'set-scene-look':
        applySceneLook({
          brightnessPercent: command.brightnessPercent,
          contrastPercent: command.contrastPercent,
          saturationPercent: command.saturationPercent
        });
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
  renderSceneLookMeta,
  activeSceneLook,
  renderCameraMeta,
  renderHighlightOverlay,
  renderPerfHud,
  publishRouteDiagnostics,
  installRouteAnalysisBridge,
  setStatus
}: InitializeViewerStartupArgs) {
  updatePresetButtons();
  updateVariantButtons();
  updateRouteButtons();
  publishRouteControls();
  renderVariantMeta(defaultVariant);
  renderRenderScaleMeta(activeRenderScalePercent);
  renderSceneLookMeta(activeSceneLook);
  renderCameraMeta(null);
  renderHighlightOverlay(null);
  renderPerfHud(null);
  publishRouteDiagnostics();
  installRouteAnalysisBridge();
  setStatus('加载中', '准备场景资源');
}

export {
  initializeViewerStartup,
  installViewerStartupBindings
};
