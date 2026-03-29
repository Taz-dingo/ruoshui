import { renderWakeSeconds } from '../config';
import { trackBenchmarkFirstFrame } from '../benchmark/runtime';
import { bindRuntimeViewport, bindRuntimeVisibility, createRuntimeApp } from './bootstrap';
import { createOrbitController } from './orbit';
import { applyRuntimeSceneLook } from './scene-look';
import { createRuntimeUpdateHandler } from './update-loop';
import { detachVariantFromRuntime, loadVariantIntoRuntime } from './variant-loader';
import type {
  CameraPreset,
  UnifiedGsplatProfile,
  ViewerVariant
} from '../content/types';
import type { VariantBenchmark } from '../benchmark/types';
import type { SceneLookSettings } from './scene-look';

interface CreateViewerRuntimeArgs {
  pc: any;
  canvasElement: HTMLCanvasElement;
  variant: ViewerVariant;
  timings?: any;
  runtimeWindow: Window;
  runtimeDocument: Document;
  renderScalePercent: number;
  sceneLook: SceneLookSettings;
  firstPreset: CameraPreset;
  createBenchmark: (variantId: string) => VariantBenchmark;
  getVariantBenchmark: (variantId: string) => VariantBenchmark | null;
  publishVariantBenchmark: (variantId: string) => void;
  updateBenchmarkRoute: (runtimeState: any, dt: number) => boolean;
  getActiveRouteId: () => string | null;
  stopActiveBenchmarkRoute: (summaryText?: string, status?: string) => void;
  renderCameraMeta: (runtimeState: any) => void;
  renderPerfHud: (runtimeState: any) => void;
}

function createViewerRuntime({
  pc,
  canvasElement,
  variant,
  timings = {},
  runtimeWindow,
  runtimeDocument,
  renderScalePercent,
  sceneLook,
  firstPreset,
  createBenchmark,
  getVariantBenchmark,
  publishVariantBenchmark,
  updateBenchmarkRoute,
  getActiveRouteId,
  stopActiveBenchmarkRoute,
  renderCameraMeta,
  renderPerfHud
}: CreateViewerRuntimeArgs) {
  const { app, performanceMode, loopController } = createRuntimeApp({
    pc,
    canvasElement,
    runtimeWindow,
    renderScalePercent
  });
  const viewportBinding = bindRuntimeViewport({
    app,
    canvasElement,
    loopController,
    runtimeWindow
  });

  const camera = new pc.Entity('MemorialCamera');
  camera.addComponent('camera', {
    clearColor: new pc.Color(0.02, 0.04, 0.06),
    fov: 52,
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

  const runtimeState = {
    variantId: variant.id,
    app,
    canvasElement,
    orbit,
    benchmark: timings.benchmark ?? createBenchmark(variant.id),
    performanceMode,
    loopController,
    routePlayback: null,
    routeRecord: null,
    splatAsset: null,
    splatEntity: null,
    variantMeta: variant,
    unifiedLodState: null,
    lastCameraSnapshot: '',
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
      detachVariantFromRuntime(runtimeState);
      viewportBinding.destroy();
      orbit.destroy();
      app.destroy();
    }
  };

  applyRuntimeSceneLook(runtimeState, sceneLook);

  orbit.onManualInput = () => {
    if (getActiveRouteId()) {
      stopActiveBenchmarkRoute('手动接管', 'manual');
    }
    runtimeState.requestRender();
  };

  const visibilityBinding = bindRuntimeVisibility({
    app,
    loopController,
    runtimeDocument,
    runtimeWindow,
    runtimeState,
    onResume: () => {
      renderCameraMeta(runtimeState);
      renderPerfHud(runtimeState);
    }
  });

  const handleUpdate = createRuntimeUpdateHandler({
    pc,
    runtimeState,
    updateBenchmarkRoute,
    publishVariantBenchmark,
    renderCameraMeta,
    renderPerfHud
  });
  app.on('update', handleUpdate);
  const destroyRuntime = runtimeState.destroy;
  runtimeState.destroy = () => {
    app.off('update', handleUpdate);
    visibilityBinding.destroy();
    destroyRuntime();
  };

  return loadVariantIntoRuntime({
    pc,
    runtimeState,
    variant,
    timings,
    createBenchmark: () => createBenchmark(variant.id),
    publishVariantBenchmark,
    configureUnifiedGsplat,
    trackFirstFrame: (targetApp, variantId, switchStartedAt) =>
      trackBenchmarkFirstFrame(
        targetApp,
        variantId,
        switchStartedAt,
        getVariantBenchmark,
        publishVariantBenchmark
      )
  }).then(() => runtimeState);
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
    warmSecondsRemaining: 0,
    riskSnapshot: null
  };
}

function normalizeUnifiedGsplatProfile(profile: UnifiedGsplatProfile | undefined) {
  return {
    lodUnderfillLimit: Number.isFinite(profile?.lodUnderfillLimit)
      ? profile.lodUnderfillLimit
      : undefined,
    cooldownTicks: Number.isFinite(profile?.cooldownTicks)
      ? profile.cooldownTicks
      : undefined,
    lodUpdateDistance: Number.isFinite(profile?.lodUpdateDistance)
      ? profile.lodUpdateDistance
      : undefined,
    lodUpdateAngle: Number.isFinite(profile?.lodUpdateAngle)
      ? profile.lodUpdateAngle
      : undefined,
    lodBehindPenalty: Number.isFinite(profile?.lodBehindPenalty)
      ? profile.lodBehindPenalty
      : undefined
  };
}

function applyUnifiedGsplatProfile(sceneGsplat: any, profile: UnifiedGsplatProfile) {
  if (!sceneGsplat || !profile) {
    return false;
  }

  let changed = false;
  for (const [key, value] of Object.entries(profile)) {
    if (!Number.isFinite(value) || sceneGsplat[key] === value) {
      continue;
    }

    sceneGsplat[key] = value;
    changed = true;
  }

  return changed;
}

function vec3(pc: any, tuple: [number, number, number]) {
  return new pc.Vec3(tuple[0], tuple[1], tuple[2]);
}

export {
  applyRuntimeSceneLook,
  configureUnifiedGsplat,
  createViewerRuntime
};
