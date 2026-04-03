import {
  projectHighlightPins,
  projectWorldPoint
} from '../../runtime/highlight-projection';
import { syncCameraState, syncHighlightOverlayState } from '../state/viewer-ui-sync';
import { formatMetricMs, formatMotionMetric } from '../../utils/format';
import {
  formatAntiAliasSummary,
  getAntiAliasNote,
  isAntiAliasSupported
} from '../../runtime/postprocessing';
import { useViewerUiStore } from '../state/viewer-ui-store';
import type { VariantBenchmark } from '../../benchmark/types';
import type { ViewerHighlight, ViewerVariant } from '../../content/types';

interface CreateViewerShellControllerArgs {
  pc: any;
  highlights: ViewerHighlight[];
  showPerfHud: boolean;
  publishVariantPanel: () => void;
  getVariantBenchmark: (variantId: string | null | undefined) => VariantBenchmark | null;
  getActivePostProcessing: () => { fxaaEnabled: boolean };
  getGraphicsBackend: () => string | null;
  getActiveVariantId: () => string;
  getActiveRenderScalePercent: () => number;
}

function createViewerShellController({
  pc,
  highlights,
  showPerfHud,
  publishVariantPanel,
  getVariantBenchmark,
  getActivePostProcessing,
  getGraphicsBackend,
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
    const postProcessing = getActivePostProcessing();
    const graphicsBackend = getGraphicsBackend();
    const antiAliasAvailable = isAntiAliasSupported(graphicsBackend);
    useViewerUiStore.getState().setRenderScale({
      summary: `${percent}%`,
      value: `${percent}% · x${pixelRatio}`,
      note:
        percent > 100
          ? '超采样渲染，边缘会更干净'
          : percent === 100
            ? '1x 渲染比例'
            : '降低像素比，换取更稳帧率',
      antiAliasEnabled: postProcessing.fxaaEnabled,
      antiAliasAvailable,
      antiAliasSummary: formatAntiAliasSummary(postProcessing, graphicsBackend),
      antiAliasNote: getAntiAliasNote(graphicsBackend)
    });
  };

  const renderCameraMeta = (runtimeState: any) => {
    syncCameraState(pc, runtimeState);
  };

  const renderHighlightOverlay = (runtimeState: any) => {
    if (!runtimeState?.camera || !runtimeState?.canvasElement) {
      syncHighlightOverlayState({ items: [] });
      const highlightAuthoring = useViewerUiStore.getState().highlightAuthoring;
      if (highlightAuthoring.previewVisible) {
        useViewerUiStore.getState().setHighlightAuthoring({
          ...highlightAuthoring,
          previewLeft: 0,
          previewTop: 0,
          previewVisible: false
        });
      }
      return;
    }

    const highlightAuthoring = useViewerUiStore.getState().highlightAuthoring;

    if (!highlightAuthoring.pointPosition) {
      if (highlightAuthoring.previewVisible) {
        useViewerUiStore.getState().setHighlightAuthoring({
          ...highlightAuthoring,
          previewLeft: 0,
          previewTop: 0,
          previewVisible: false
        });
      }
    } else {
      const projectedPreview = projectWorldPoint(
        pc,
        runtimeState,
        highlightAuthoring.pointPosition
      );

      useViewerUiStore.getState().setHighlightAuthoring({
        ...highlightAuthoring,
        previewLeft: projectedPreview?.left ?? 0,
        previewTop: projectedPreview?.top ?? 0,
        previewVisible: projectedPreview?.isVisible ?? false
      });
    }

    const items = highlights.length > 0
      ? projectHighlightPins({
          pc,
          runtimeState,
          highlights
        })
      : [];
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
        scale: `${getActiveRenderScalePercent()}%`,
        backend: '—',
        gpu: '未检测'
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
      scale: `${getActiveRenderScalePercent()}%`,
      backend: runtimeState.graphicsBackend ?? '—',
      gpu: formatGpuDiagnostics(runtimeState.gpuDiagnostics, runtimeState.graphicsBackend)
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

function formatGpuDiagnostics(diagnostics: any, backend: string) {
  if (!diagnostics?.navigatorGpuAvailable) {
    return 'navigator.gpu: 无';
  }

  const adapterText = diagnostics.adapterName ?? 'Adapter 未返回';
  return `${backend} · ${adapterText}`;
}

export {
  createViewerShellController
};
