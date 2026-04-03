import {
  advanceRuntimeBenchmarkRoute as advanceBenchmarkPlaybackRoute,
  captureRuntimeView,
  moveRuntimeCamera,
  restoreRuntimeView,
  startRuntimeBenchmarkRoute,
  stopRuntimeBenchmarkRoute as stopBenchmarkPlaybackRoute,
  updateRuntimeBenchmarkRoute as updateBenchmarkPlaybackRoute,
} from "../benchmark/playback";
import { createViewerRuntime } from "./runtime-factory";
import type { GraphicsBackendPreference } from "./bootstrap";

interface CreateViewerRuntimeControllerArgs {
  pc: any;
  firstPreset: any;
  runtimeWindow: Window;
  runtimeDocument: Document;
  graphicsBackendPreference: GraphicsBackendPreference;
  longTaskBuffer: Array<{ startTime: number; duration: number }>;
  gpuDiagnostics?: any;
  getActiveRouteId: () => string | null;
  getActiveSuiteRunId: () => string | null;
  getActiveRenderScalePercent: () => number;
  getActiveSceneLook: () => any;
  getActivePostProcessing: () => any;
  getVariantBenchmark: (variantId: string | null | undefined) => any;
  publishVariantBenchmark: (variantId: string) => void;
  createBenchmark: (variantId: string) => any;
  getRouteSummaryText: () => string;
  setRouteSummaryText: (summaryText: string) => void;
  clearActiveRoute: () => void;
  updateRouteButtons: () => void;
  publishRouteControls: () => void;
  finalizeRouteRunRecord: (runtimeState: any, status: string) => any;
  renderCameraMeta: (runtimeState: any) => void;
  renderHighlightOverlay: (runtimeState: any) => void;
  renderPerfHud: (runtimeState: any) => void;
  setStatus: (title: string, detail: string) => void;
}

function createViewerRuntimeController({
  pc,
  firstPreset,
  runtimeWindow,
  runtimeDocument,
  graphicsBackendPreference,
  longTaskBuffer,
  gpuDiagnostics = null,
  getActiveRouteId,
  getActiveSuiteRunId,
  getActiveRenderScalePercent,
  getActiveSceneLook,
  getActivePostProcessing,
  getVariantBenchmark,
  publishVariantBenchmark,
  createBenchmark,
  setRouteSummaryText,
  clearActiveRoute,
  updateRouteButtons,
  publishRouteControls,
  finalizeRouteRunRecord,
  renderCameraMeta,
  renderHighlightOverlay,
  renderPerfHud,
  setStatus,
}: CreateViewerRuntimeControllerArgs) {
  function stopBenchmarkRoute(runtimeState: any, status = "aborted") {
    stopBenchmarkPlaybackRoute({
      runtimeState,
      status,
      finalizeRouteRunRecord,
    });
  }

  function stopActiveBenchmarkRoute(runtimeState: any, summaryText = "未播放", status = "aborted") {
    if (runtimeState) {
      stopBenchmarkRoute(runtimeState, status);
    }

    clearActiveRoute();
    setRouteSummaryText(summaryText);
    updateRouteButtons();
  }

  function advanceBenchmarkRoute(runtimeState: any) {
    return advanceBenchmarkPlaybackRoute({
      runtimeState,
      pc,
      vec3: (tuple: [number, number, number]) => new pc.Vec3(tuple[0], tuple[1], tuple[2]),
      activeRouteId: getActiveRouteId(),
      onActiveRouteCompleted: (summaryText?: string, status?: string) =>
        stopActiveBenchmarkRoute(runtimeState, summaryText, status),
      stopRuntimeBenchmarkRoute: (state: any, status?: string) =>
        stopBenchmarkRoute(state, status),
      updateRouteSummary: (summaryText) => {
        setRouteSummaryText(summaryText);
        publishRouteControls();
      },
    });
  }

  function updateBenchmarkRoute(runtimeState: any, dt: number) {
    return updateBenchmarkPlaybackRoute({
      runtimeState,
      dt,
      advanceRuntimeBenchmarkRoute: () => advanceBenchmarkRoute(runtimeState),
    });
  }

  async function createRuntime(
    canvasElement: HTMLCanvasElement,
    variant: any,
    timings: any = {},
    sceneLook = getActiveSceneLook(),
  ) {
    return createViewerRuntime({
      pc,
      canvasElement,
      variant,
      timings,
      runtimeWindow,
      runtimeDocument,
      graphicsBackendPreference,
      renderScalePercent: getActiveRenderScalePercent(),
      sceneLook,
      postProcessing: getActivePostProcessing(),
      firstPreset,
      gpuDiagnostics,
      createBenchmark,
      getVariantBenchmark,
      publishVariantBenchmark,
      setStatus,
      updateBenchmarkRoute,
      getActiveRouteId,
      stopActiveBenchmarkRoute: (summaryText?: string, status?: string) =>
        stopActiveBenchmarkRoute(null, summaryText, status),
      renderCameraMeta,
      renderHighlightOverlay,
      renderPerfHud,
    });
  }

  function moveCamera(runtimeState: any, preset: any, immediate = false) {
    moveRuntimeCamera({
      runtimeState,
      preset,
      immediate,
      pc,
      vec3: (tuple: [number, number, number]) => new pc.Vec3(tuple[0], tuple[1], tuple[2]),
    });
  }

  function startBenchmarkRoute(runtimeState: any, route: any, options: any = {}) {
    startRuntimeBenchmarkRoute({
      runtimeState,
      route,
      suiteId: getActiveSuiteRunId(),
      renderScalePercent: getActiveRenderScalePercent(),
      longTaskBuffer,
      onFinish: options.onFinish ?? null,
    });
    publishVariantBenchmark(runtimeState?.variantId);
    advanceBenchmarkRoute(runtimeState);
  }

  function captureCurrentView(runtimeState: any) {
    return captureRuntimeView(runtimeState);
  }

  function restoreCurrentView(runtimeState: any, snapshot: any) {
    return restoreRuntimeView({
      runtimeState,
      snapshot,
      pc,
    });
  }

  return {
    advanceBenchmarkRoute,
    captureCurrentView,
    createRuntime,
    moveCamera,
    restoreCurrentView,
    startBenchmarkRoute,
    stopActiveBenchmarkRoute,
    updateBenchmarkRoute,
  };
}

export {
  createViewerRuntimeController,
};
