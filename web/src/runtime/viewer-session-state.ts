import type { SceneLookSettings } from './scene-look';
import type { PostProcessingSettings } from './postprocessing';

interface CreateViewerSessionStateArgs {
  defaultVariantId: string;
  firstPresetId: string;
  initialRenderScalePercent: number;
  initialSceneLook: SceneLookSettings;
  initialPostProcessing: PostProcessingSettings;
  initialSelectedRouteId: string | null;
}

function createViewerSessionState({
  defaultVariantId,
  firstPresetId,
  initialRenderScalePercent,
  initialSceneLook,
  initialPostProcessing,
  initialSelectedRouteId
}: CreateViewerSessionStateArgs) {
  let runtime: any = null;
  let activePresetId = firstPresetId;
  let activeVariantId = defaultVariantId;
  let activeRouteId: string | null = null;
  let selectedRouteId = initialSelectedRouteId;
  let currentLoadToken = 0;
  let activeRenderScalePercent = initialRenderScalePercent;
  let activeSceneLook = initialSceneLook;
  let activePostProcessing = initialPostProcessing;
  let isBatchBenchmarkRunning = false;
  let activeSuiteRunId: string | null = null;
  let activeBenchmarkRunPromise: Promise<any> | null = null;
  let isVariantPanelDisabled = false;
  let routeSummaryText = '未播放';

  return {
    getRuntime: () => runtime,
    setRuntime: (runtimeState: any) => {
      runtime = runtimeState;
      if (runtimeState?.activePostProcessing) {
        activePostProcessing = runtimeState.activePostProcessing;
      }
    },
    getActivePresetId: () => activePresetId,
    setActivePresetId: (presetId: string) => {
      activePresetId = presetId;
    },
    getActiveVariantId: () => activeVariantId,
    setActiveVariantId: (variantId: string) => {
      activeVariantId = variantId;
    },
    getActiveRouteId: () => activeRouteId,
    setActiveRouteId: (routeId: string | null) => {
      activeRouteId = routeId;
    },
    getSelectedRouteId: () => selectedRouteId,
    setSelectedRouteId: (routeId: string | null) => {
      selectedRouteId = routeId;
    },
    issueLoadToken: () => {
      currentLoadToken += 1;
      return currentLoadToken;
    },
    isCurrentLoadToken: (loadToken: number) => loadToken === currentLoadToken,
    getActiveRenderScalePercent: () => activeRenderScalePercent,
    setActiveRenderScalePercent: (nextPercent: number) => {
      activeRenderScalePercent = nextPercent;
    },
    getActiveSceneLook: () => activeSceneLook,
    setActiveSceneLook: (sceneLook: SceneLookSettings) => {
      activeSceneLook = sceneLook;
    },
    getActivePostProcessing: () => activePostProcessing,
    setActivePostProcessing: (postProcessing: PostProcessingSettings) => {
      activePostProcessing = postProcessing;
    },
    getIsBatchBenchmarkRunning: () => isBatchBenchmarkRunning,
    setIsBatchBenchmarkRunning: (isRunning: boolean) => {
      isBatchBenchmarkRunning = isRunning;
    },
    getActiveSuiteRunId: () => activeSuiteRunId,
    setActiveSuiteRunId: (suiteId: string | null) => {
      activeSuiteRunId = suiteId;
    },
    getActiveBenchmarkRunPromise: () => activeBenchmarkRunPromise,
    setActiveBenchmarkRunPromise: (promise: Promise<any> | null) => {
      activeBenchmarkRunPromise = promise;
    },
    getIsVariantPanelDisabled: () => isVariantPanelDisabled,
    setIsVariantPanelDisabled: (disabled: boolean) => {
      isVariantPanelDisabled = disabled;
    },
    getRouteSummaryText: () => routeSummaryText,
    setRouteSummaryText: (summaryText: string) => {
      routeSummaryText = summaryText;
    }
  };
}

export {
  createViewerSessionState
};
