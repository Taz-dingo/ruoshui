import { syncCameraState } from './viewer-ui-sync';
import { formatMetricMs, formatMotionMetric } from '../utils/format';
import type { VariantBenchmark, ViewerVariant } from '../types';

interface CreateViewerShellControllerArgs {
  inspectorToggles: HTMLButtonElement[];
  inspectorBodies: Map<string, HTMLElement>;
  variantSize: HTMLElement;
  variantSplats: HTMLElement;
  variantRetention: HTMLElement;
  variantTitle: HTMLElement;
  variantNote: HTMLElement;
  metricLoad: HTMLElement;
  metricFirstFrame: HTMLElement;
  metricMotion: HTMLElement;
  renderScaleValue: HTMLElement;
  qualitySummary: HTMLElement;
  renderScaleNote: HTMLElement;
  showPerfHud: boolean;
  perfFps: HTMLElement | null;
  perfMs: HTMLElement | null;
  perfRender: HTMLElement | null;
  perfScale: HTMLElement | null;
  publishVariantPanel: () => void;
  getVariantBenchmark: (variantId: string | null | undefined) => VariantBenchmark | null;
  getActiveVariantId: () => string;
  getActiveRenderScalePercent: () => number;
}

function createViewerShellController({
  inspectorToggles,
  inspectorBodies,
  variantSize,
  variantSplats,
  variantRetention,
  variantTitle,
  variantNote,
  metricLoad,
  metricFirstFrame,
  metricMotion,
  renderScaleValue,
  qualitySummary,
  renderScaleNote,
  showPerfHud,
  perfFps,
  perfMs,
  perfRender,
  perfScale,
  publishVariantPanel,
  getVariantBenchmark,
  getActiveVariantId,
  getActiveRenderScalePercent
}: CreateViewerShellControllerArgs) {
  const renderVariantBenchmark = (variantId: string) => {
    const benchmark = getVariantBenchmark(variantId);
    metricLoad.textContent = formatMetricMs(benchmark?.loadMs);
    metricFirstFrame.textContent = formatMetricMs(benchmark?.firstFrameMs);
    metricMotion.textContent = formatMotionMetric(benchmark);
  };

  const renderVariantMeta = (variant: ViewerVariant) => {
    variantSize.textContent = variant.size;
    variantSplats.textContent = variant.splats;
    variantRetention.textContent = variant.retention;
    variantTitle.textContent = variant.name;
    variantNote.textContent = variant.note;
    publishVariantPanel();
    renderVariantBenchmark(variant.id);
  };

  const renderRenderScaleMeta = (percent: number) => {
    const pixelRatio = (percent / 100).toFixed(2);
    renderScaleValue.textContent = `${percent}% · x${pixelRatio}`;
    qualitySummary.textContent = `${percent}%`;
    renderScaleNote.textContent =
      percent >= 100 ? '原生像素比' : '降低像素比，换取更稳帧率';
  };

  const setOpenInspectorPanel = (panelId: string | null) => {
    for (const toggle of inspectorToggles) {
      const isOpen = toggle.dataset.toggle === panelId;
      toggle.classList.toggle('is-active', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
    }

    for (const [bodyId, body] of inspectorBodies) {
      body.classList.toggle('is-open', bodyId === panelId);
    }
  };

  const renderCameraMeta = (runtimeState: any) => {
    syncCameraState(runtimeState);
  };

  const renderPerfHud = (runtimeState: any) => {
    if (!showPerfHud || !perfFps || !perfMs || !perfRender || !perfScale) {
      return;
    }

    perfScale.textContent = `${getActiveRenderScalePercent()}%`;

    if (!runtimeState?.app || !runtimeState?.performanceMode) {
      perfFps.textContent = '—';
      perfMs.textContent = '—';
      perfRender.textContent = '未加载';
      return;
    }

    const sampleTime = runtimeState.perfHudElapsed;
    const frameCount = runtimeState.perfHudFrames;
    if (sampleTime > 0 && frameCount > 0) {
      const fps = frameCount / sampleTime;
      const ms = (sampleTime / frameCount) * 1000;
      perfFps.textContent = `${Math.round(fps)}`;
      perfMs.textContent = `${ms.toFixed(1)} ms`;
    }

    const isRendering =
      runtimeState.app.autoRender || runtimeState.performanceMode.isInteracting;
    perfRender.textContent = isRendering ? '活动' : '静止';
    renderVariantBenchmark(getActiveVariantId());
  };

  return {
    renderCameraMeta,
    renderPerfHud,
    renderRenderScaleMeta,
    renderVariantBenchmark,
    renderVariantMeta,
    setOpenInspectorPanel
  };
}

export {
  createViewerShellController
};
