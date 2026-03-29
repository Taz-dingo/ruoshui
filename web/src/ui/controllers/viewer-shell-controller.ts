import { projectHighlightPins } from '../../runtime/highlight-projection';
import { syncCameraState, syncHighlightOverlayState } from '../state/viewer-ui-sync';
import { formatMetricMs, formatMotionMetric } from '../../utils/format';
import { useViewerUiStore } from '../state/viewer-ui-store';
import type { VariantBenchmark } from '../../benchmark/types';
import type { ViewerHighlight, ViewerVariant } from '../../content/types';

interface CreateViewerShellControllerArgs {
  pc: any;
  highlights: ViewerHighlight[];
  showPerfHud: boolean;
  publishVariantPanel: () => void;
  getVariantBenchmark: (variantId: string | null | undefined) => VariantBenchmark | null;
  getActiveVariantId: () => string;
  getActiveRenderScalePercent: () => number;
}

function createViewerShellController({
  pc,
  highlights,
  showPerfHud,
  publishVariantPanel,
  getVariantBenchmark,
  getActiveVariantId,
  getActiveRenderScalePercent
}: CreateViewerShellControllerArgs) {
  const renderVariantBenchmark = (variantId: string) => {
    const benchmark = getVariantBenchmark(variantId);
    useViewerUiStore.getState().setSceneMetrics({
      load: formatMetricMs(benchmark?.loadMs),
      firstFrame: formatMetricMs(benchmark?.firstFrameMs),
      motion: formatMotionMetric(benchmark)
    });
  };

  const renderVariantMeta = (variant: ViewerVariant) => {
    useViewerUiStore.getState().setSceneMeta({
      title: variant.name,
      size: variant.size,
      splats: variant.splats,
      retention: variant.retention,
      note: variant.note
    });
    publishVariantPanel();
    renderVariantBenchmark(variant.id);
  };

  const renderRenderScaleMeta = (percent: number) => {
    const pixelRatio = (percent / 100).toFixed(2);
    useViewerUiStore.getState().setRenderScale({
      summary: `${percent}%`,
      value: `${percent}% · x${pixelRatio}`,
      note: percent >= 100 ? '原生像素比' : '降低像素比，换取更稳帧率'
    });
  };

  const renderCameraMeta = (runtimeState: any) => {
    syncCameraState(runtimeState);
  };

  const renderHighlightOverlay = (runtimeState: any) => {
    if (highlights.length === 0) {
      return;
    }

    const items = projectHighlightPins({
      pc,
      runtimeState,
      highlights
    });
    const snapshot = items
      .map((item) =>
        `${item.id}:${item.isVisible ? 1 : 0}:${Math.round(item.left)}:${Math.round(item.top)}`
      )
      .join('|');

    if (runtimeState?.lastHighlightOverlaySnapshot === snapshot) {
      return;
    }

    runtimeState.lastHighlightOverlaySnapshot = snapshot;
    syncHighlightOverlayState({ items });
  };

  const renderPerfHud = (runtimeState: any) => {
    if (!showPerfHud) {
      return;
    }

    const perfHudState = useViewerUiStore.getState();

    if (!runtimeState?.app || !runtimeState?.performanceMode) {
      perfHudState.setPerfHud({
        fps: '—',
        ms: '—',
        render: '未加载',
        scale: `${getActiveRenderScalePercent()}%`
      });
      return;
    }

    let fpsText = perfHudState.perfHud.fps;
    let msText = perfHudState.perfHud.ms;
    const sampleTime = runtimeState.perfHudElapsed;
    const frameCount = runtimeState.perfHudFrames;
    if (sampleTime > 0 && frameCount > 0) {
      const fps = frameCount / sampleTime;
      const ms = (sampleTime / frameCount) * 1000;
      fpsText = `${Math.round(fps)}`;
      msText = `${ms.toFixed(1)} ms`;
    }

    const isRendering =
      runtimeState.app.autoRender || runtimeState.performanceMode.isInteracting;
    perfHudState.setPerfHud({
      fps: fpsText,
      ms: msText,
      render: isRendering ? '活动' : '静止',
      scale: `${getActiveRenderScalePercent()}%`
    });
    renderVariantBenchmark(getActiveVariantId());
  };

  return {
    renderCameraMeta,
    renderHighlightOverlay,
    renderPerfHud,
    renderRenderScaleMeta,
    renderVariantBenchmark,
    renderVariantMeta
  };
}

export {
  createViewerShellController
};
