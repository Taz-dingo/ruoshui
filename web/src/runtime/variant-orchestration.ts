import { trackBenchmarkFirstFrame } from '../benchmark/runtime';
import { createSceneCanvas } from './canvas-host';
import { configureUnifiedGsplat } from './runtime-factory';
import { loadVariantIntoRuntime } from './variant-loader';
import type { VariantBenchmark } from '../benchmark/types';
import type { CameraPreset, ViewerVariant } from '../content/types';
import type { SceneLookSettings } from './scene-look';

interface CreateVariantOrchestrationControllerArgs {
  pc: any;
  presets: CameraPreset[];
  variantsById: Map<string, ViewerVariant>;
  sceneContainer: HTMLDivElement;
  getRuntime: () => any;
  setRuntime: (runtimeState: any) => void;
  getActiveVariantId: () => string;
  setActiveVariantId: (variantId: string) => void;
  getActivePresetId: () => string;
  setActivePresetId: (presetId: string) => void;
  getActiveRouteId: () => string | null;
  getSceneLook: () => SceneLookSettings;
  issueLoadToken: () => number;
  isCurrentLoadToken: (loadToken: number) => boolean;
  createBenchmark: (variantId: string) => VariantBenchmark;
  renderVariantMeta: (variant: ViewerVariant) => void;
  updateVariantButtons: () => void;
  updatePresetButtons: () => void;
  setVariantButtonsDisabled: (disabled: boolean) => void;
  setPresetSummary: (summary: string) => void;
  setLoading: (mode: 'boot' | 'switch') => void;
  clearLoading: () => void;
  setStatus: (title: string, detail: string) => void;
  stopActiveBenchmarkRoute: (summaryText?: string, status?: string) => void;
  captureCurrentView: (runtimeState: any) => any;
  restoreCurrentView: (runtimeState: any, snapshot: any) => boolean;
  createRuntime: (
    canvasElement: HTMLCanvasElement,
    variant: ViewerVariant,
    timings?: any,
    sceneLook?: SceneLookSettings
  ) => Promise<any>;
  moveCamera: (runtimeState: any, preset: CameraPreset, immediate?: boolean) => void;
  publishVariantBenchmark: (variantId: string) => void;
  getVariantBenchmark: (variantId: string) => VariantBenchmark | null;
}

function createVariantOrchestrationController({
  pc,
  presets,
  variantsById,
  sceneContainer,
  getRuntime,
  setRuntime,
  getActiveVariantId,
  setActiveVariantId,
  getActivePresetId,
  setActivePresetId,
  getActiveRouteId,
  getSceneLook,
  issueLoadToken,
  isCurrentLoadToken,
  createBenchmark,
  renderVariantMeta,
  updateVariantButtons,
  updatePresetButtons,
  setVariantButtonsDisabled,
  setPresetSummary,
  setLoading,
  clearLoading,
  setStatus,
  stopActiveBenchmarkRoute,
  captureCurrentView,
  restoreCurrentView,
  createRuntime,
  moveCamera,
  publishVariantBenchmark,
  getVariantBenchmark
}: CreateVariantOrchestrationControllerArgs) {
  function clearLoadingAfterPresent(runtimeState: any, loadToken: number) {
    let resolved = false;

    const finalize = () => {
      if (resolved) {
        return;
      }

      resolved = true;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (isCurrentLoadToken(loadToken)) {
            clearLoading();
          }
        });
      });
    };

    if (!runtimeState?.app?.once) {
      finalize();
      return;
    }

    runtimeState.app.once('frameend', finalize);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(finalize);
    });
  }

  async function mountRuntime(variant: ViewerVariant, timings: any) {
    const runtime = getRuntime();
    if (runtime) {
      await loadVariantIntoRuntime({
        pc,
        runtimeState: runtime,
        variant,
        timings,
        createBenchmark: () => createBenchmark(variant.id),
        publishVariantBenchmark,
        configureUnifiedGsplat,
        setStatus,
        trackFirstFrame: (app, variantId, switchStartedAt) =>
          trackBenchmarkFirstFrame(
            app,
            variantId,
            switchStartedAt,
            getVariantBenchmark,
            publishVariantBenchmark
          )
      });
      return runtime;
    }

    const canvas = createSceneCanvas(sceneContainer);
    return createRuntime(canvas, variant, timings, getSceneLook());
  }

  function activatePreset(presetId: string, immediate = false) {
    const preset = presets.find((entry) => entry.id === presetId);
    if (!preset) {
      return;
    }

    if (getActiveRouteId()) {
      stopActiveBenchmarkRoute('镜头接管', 'manual');
    }

    setActivePresetId(preset.id);
    setPresetSummary(preset.name);
    updatePresetButtons();

    const runtime = getRuntime();
    if (runtime) {
      moveCamera(runtime, preset, immediate);
    }
  }

  async function activateVariant(
    variantId: string,
    initial = false,
    forceReload = false
  ) {
    const variant = variantsById.get(variantId);

    if (!variant) {
      return;
    }

    if (!initial && !forceReload && variantId === getActiveVariantId()) {
      return;
    }

    if (getActiveRouteId()) {
      stopActiveBenchmarkRoute('未播放', 'switch');
    }

    const loadToken = issueLoadToken();
    const hadExistingRuntime = Boolean(getRuntime());
    const switchStartedAt = performance.now();
    const preservedView = initial ? null : captureCurrentView(getRuntime());
    const benchmark = createBenchmark(variant.id);
    setActiveVariantId(variant.id);
    updateVariantButtons();
    renderVariantMeta(variant);
    setVariantButtonsDisabled(true);
    setLoading(initial ? 'boot' : 'switch');
    setStatus(
      initial ? '正在展开' : '正在切换',
      initial ? `准备进入 ${variant.name}` : `切换至 ${variant.name}`
    );

    try {
      const nextRuntime = await mountRuntime(variant, {
        switchStartedAt,
        benchmark,
        shouldAbort: () => !isCurrentLoadToken(loadToken)
      });
      if (!isCurrentLoadToken(loadToken)) {
        if (!hadExistingRuntime) {
          nextRuntime?.destroy?.();
        }
        return;
      }

      setRuntime(nextRuntime);
      const restored = restoreCurrentView(nextRuntime, preservedView);
      if (!restored) {
        activatePreset(getActivePresetId() || 'hover', true);
      }
      setStatus('场景已就绪', `${variant.size} · ${variant.retention} 保留`);
      clearLoadingAfterPresent(nextRuntime, loadToken);
    } catch (error) {
      setStatus(
        '加载失败',
        error instanceof Error ? error.message : '未知错误'
      );
      clearLoading();
      throw error;
    } finally {
      if (isCurrentLoadToken(loadToken)) {
        setVariantButtonsDisabled(false);
      }
    }
  }

  return {
    activatePreset,
    activateVariant
  };
}

export {
  createVariantOrchestrationController
};
