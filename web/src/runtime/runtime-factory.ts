import { renderWakeSeconds } from '../config';
import { trackBenchmarkFirstFrame } from '../benchmark/runtime';
import {
  bindRuntimeViewport,
  bindRuntimeVisibility,
  createRuntimeApp
} from './bootstrap';
import type { GraphicsBackendPreference } from './bootstrap';
import {
  createRuntimeEnvironment,
  destroyRuntimeEnvironment,
  updateRuntimeEnvironment
} from './environment';
import { createOrbitController } from './orbit';
import {
  applyRuntimePostProcessing,
  destroyRuntimePostProcessing,
  sanitizePostProcessingSettings
} from './postprocessing';
import { applyRuntimeSceneLook } from './scene-look';
import {
  applyUnifiedGsplatProfile,
  deriveWarmupUnifiedGsplatProfile,
  normalizeUnifiedGsplatProfile
} from './unified-gsplat-profile';
import { createRuntimeUpdateHandler } from './update-loop';
import { detachVariantFromRuntime, loadVariantIntoRuntime } from './variant-loader';
import type {
  CameraPreset,
  ViewerVariant
} from '../content/types';
import type { VariantBenchmark } from '../benchmark/types';
import type { PostProcessingSettings } from './postprocessing';
import type { SceneLookSettings } from './scene-look';

interface CreateViewerRuntimeArgs {
  pc: any;
  canvasElement: HTMLCanvasElement;
  variant: ViewerVariant;
  timings?: any;
  runtimeWindow: Window;
  runtimeDocument: Document;
  graphicsBackendPreference: GraphicsBackendPreference;
  renderScalePercent: number;
  sceneLook: SceneLookSettings;
  postProcessing: PostProcessingSettings;
  firstPreset: CameraPreset;
  gpuDiagnostics?: any;
  createBenchmark: (variantId: string) => VariantBenchmark;
  getVariantBenchmark: (variantId: string) => VariantBenchmark | null;
  publishVariantBenchmark: (variantId: string) => void;
  setStatus?: (title: string, detail: string) => void;
  updateBenchmarkRoute: (runtimeState: any, dt: number) => boolean;
  getActiveRouteId: () => string | null;
  stopActiveBenchmarkRoute: (summaryText?: string, status?: string) => void;
  renderCameraMeta: (runtimeState: any) => void;
  renderHighlightOverlay: (runtimeState: any) => void;
  renderPerfHud: (runtimeState: any) => void;
}

async function createViewerRuntime({
  pc,
  canvasElement,
  variant,
  timings = {},
  runtimeWindow,
  runtimeDocument,
  graphicsBackendPreference,
  renderScalePercent,
  sceneLook,
  postProcessing,
  firstPreset,
  gpuDiagnostics = null,
  createBenchmark,
  getVariantBenchmark,
  publishVariantBenchmark,
  setStatus,
  updateBenchmarkRoute,
  getActiveRouteId,
  stopActiveBenchmarkRoute,
  renderCameraMeta,
  renderHighlightOverlay,
  renderPerfHud
}: CreateViewerRuntimeArgs) {
  const { app, graphicsBackend, performanceMode, loopController } = await createRuntimeApp({
    pc,
    canvasElement,
    graphicsBackendPreference,
    runtimeWindow,
    renderScalePercent,
    gpuDiagnostics
  });
  const viewportBinding = bindRuntimeViewport({
    app,
    canvasElement,
    loopController,
    runtimeWindow
  });

  const camera = new pc.Entity('MemorialCamera');
  camera.addComponent('camera', {
    clearColor: new pc.Color(0, 0, 0, 1),
    clearColorBuffer: true,
    clearDepthBuffer: true,
    fov: 52,
    layers: [
      pc.LAYERID_WORLD,
      pc.LAYERID_DEPTH,
      pc.LAYERID_SKYBOX,
      pc.LAYERID_IMMEDIATE,
      pc.LAYERID_UI
    ],
    nearClip: 0.01,
    farClip: 64
  });
  app.root.addChild(camera);

  const initialTarget = vec3(pc, firstPreset.target);
  const initialPosition = vec3(pc, firstPreset.position);
  const orbit = createOrbitController(
    pc,
    camera,
    canvasElement,
    initialPosition,
    initialTarget,
    performanceMode
  );
  const environment = await createRuntimeEnvironment(pc, app);
  const activePostProcessing = sanitizePostProcessingSettings(
    postProcessing,
    graphicsBackend
  );

  const runtimeState = {
    variantId: variant.id,
    app,
    camera,
    canvasElement,
    orbit,
    environment,
    activePostProcessing,
    postProcessing: null,
    benchmark: timings.benchmark ?? createBenchmark(variant.id),
    graphicsBackend,
    gpuDiagnostics,
    performanceMode,
    loopController,
    routePlayback: null,
    routeRecord: null,
    splatAsset: null,
    splatEntity: null,
    variantMeta: variant,
    unifiedLodState: null,
    lastCameraSnapshot: '',
    lastHighlightOverlaySnapshot: '',
    cameraMetaElapsed: 0,
    perfHudElapsed: 0,
    perfHudFrames: 0,
    renderWakeRemaining: renderWakeSeconds,
    requestRender: () => {
      loopController.wake();
      runtimeState.renderWakeRemaining = renderWakeSeconds;
      app.autoRender = true;
      app.renderNextFrame = true;
    },
    destroy: () => {
      loopController.wake();
      destroyRuntimePostProcessing(runtimeState);
      detachVariantFromRuntime(runtimeState);
      viewportBinding.destroy();
      orbit.destroy();
      destroyRuntimeEnvironment(environment);
      app.destroy();
    }
  };

  updateRuntimeEnvironment(runtimeState);
  applyRuntimeSceneLook(runtimeState, sceneLook);
  applyRuntimePostProcessing(pc, runtimeState, activePostProcessing);

  orbit.onManualInput = () => {
    if (getActiveRouteId()) {
      stopActiveBenchmarkRoute('手动接管', 'manual');
    }
    runtimeState.requestRender();
  };

  const visibilityBinding = bindRuntimeVisibility({
    app,
    canvasElement,
    loopController,
    runtimeDocument,
    runtimeWindow,
    runtimeState,
    onResume: () => {
      renderCameraMeta(runtimeState);
      renderHighlightOverlay(runtimeState);
      renderPerfHud(runtimeState);
    }
  });

  const handleUpdate = createRuntimeUpdateHandler({
    pc,
    runtimeState,
    updateBenchmarkRoute,
    publishVariantBenchmark,
    renderCameraMeta,
    renderHighlightOverlay,
    renderPerfHud
  });
  app.on('update', handleUpdate);
  const destroyRuntime = runtimeState.destroy;
  runtimeState.destroy = () => {
    app.off('update', handleUpdate);
    visibilityBinding.destroy();
    destroyRuntime();
  };

  await loadVariantIntoRuntime({
    pc,
    runtimeState,
    variant,
    timings,
    createBenchmark: () => createBenchmark(variant.id),
    publishVariantBenchmark,
    configureUnifiedGsplat,
    setStatus,
    trackFirstFrame: (targetApp, variantId, switchStartedAt) =>
      trackBenchmarkFirstFrame(
        targetApp,
        variantId,
        switchStartedAt,
        getVariantBenchmark,
        publishVariantBenchmark
      )
  });

  return runtimeState;
}

function configureUnifiedGsplat(app: any, variant: ViewerVariant) {
  if (!variant?.unified || !variant.unifiedTuning || !app?.scene?.gsplat) {
    return null;
  }

  const baseProfile = normalizeUnifiedGsplatProfile(variant.unifiedTuning);
  applyUnifiedGsplatProfile(app.scene.gsplat, baseProfile);

  return {
    mode: 'base',
    baseProfile,
    warmupProfile: deriveWarmupUnifiedGsplatProfile(baseProfile),
    activeProfile: 'base',
    warmSecondsRemaining: 0,
    riskSnapshot: null
  };
}

function vec3(pc: any, tuple: [number, number, number]) {
  return new pc.Vec3(tuple[0], tuple[1], tuple[2]);
}

export {
  applyRuntimeSceneLook,
  configureUnifiedGsplat,
  createViewerRuntime
};
