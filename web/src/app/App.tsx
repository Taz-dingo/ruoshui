import type { RefObject } from 'react';
import { useEffect, useState } from 'react';

import { CameraMiniMap } from '../components/viewer/CameraMiniMap';
import { HeroPanel } from '../components/viewer/HeroPanel';
import { HighlightLayer } from '../components/viewer/HighlightLayer';
import { LoadingOverlay } from '../components/viewer/LoadingOverlay';
import { ViewerInspectorPanels } from '../components/viewer/ViewerInspectorPanels';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent } from '../components/ui/sheet';
import { useViewerUiStore } from '../ui/state/viewer-ui-store';
import type { ViewerConfig } from './viewer-config';
import type {
  MiniMapImageTransform,
  ViewerContent
} from '../content/types';

interface AppProps {
  data: ViewerContent;
  sceneContainerRef: RefObject<HTMLDivElement | null>;
  viewerConfig: ViewerConfig;
}

function stopInteractionPropagation(event: {
  stopPropagation: () => void;
  preventDefault?: () => void;
}) {
  event.stopPropagation();
}

function createDefaultMiniMapTransform(
  transform: MiniMapImageTransform | undefined
): MiniMapImageTransform {
  return {
    rotationDeg: transform?.rotationDeg ?? 0,
    scale: transform?.scale ?? 1,
    translateX: transform?.translateX ?? 0,
    translateY: transform?.translateY ?? 0,
    flipX: transform?.flipX ?? false,
    flipY: transform?.flipY ?? false,
    invertWorldX: transform?.invertWorldX ?? false,
    invertWorldZ: transform?.invertWorldZ ?? false,
    invertHeadingX: transform?.invertHeadingX ?? false
  };
}

function serializeMiniMapTransform(transform: MiniMapImageTransform) {
  return JSON.stringify(
    {
      imageTransform: {
        rotationDeg: Number((transform.rotationDeg ?? 0).toFixed(1)),
        scale: Number((transform.scale ?? 1).toFixed(3)),
        translateX: Math.round(transform.translateX ?? 0),
        translateY: Math.round(transform.translateY ?? 0),
        flipX: Boolean(transform.flipX),
        flipY: Boolean(transform.flipY),
        invertWorldX: Boolean(transform.invertWorldX),
        invertWorldZ: Boolean(transform.invertWorldZ),
        invertHeadingX: Boolean(transform.invertHeadingX)
      }
    },
    null,
    2
  );
}

function App({
  data,
  sceneContainerRef,
  viewerConfig
}: AppProps) {
  const isProductionUi = !viewerConfig.showExperimentalControls;
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [activeInspectorPanel, setActiveInspectorPanel] = useState<string | null>(null);
  const [miniMapTransform, setMiniMapTransform] = useState<MiniMapImageTransform | null>(
    data.scene.miniMap
      ? createDefaultMiniMapTransform(data.scene.miniMap.imageTransform)
      : null
  );
  const [miniMapCopyNote, setMiniMapCopyNote] = useState('调到对齐后，点“复制参数”。');
  const setVariantPanel = useViewerUiStore((store) => store.setVariantPanel);
  const setPresetPanel = useViewerUiStore((store) => store.setPresetPanel);
  const setRouteControls = useViewerUiStore((store) => store.setRouteControls);
  const camera = useViewerUiStore((store) => store.camera);
  const perfHud = useViewerUiStore((store) => store.perfHud);

  const toggleInspectorPanel = (panelId: string) => {
    if (isMobileViewport) {
      setIsMobilePanelOpen(true);
    }

    setActiveInspectorPanel((currentPanelId) =>
      currentPanelId === panelId ? null : panelId
    );
  };

  const toggleMobilePanel = () => {
    setIsMobilePanelOpen((isOpen) => {
      const nextOpen = !isOpen;
      if (nextOpen && !activeInspectorPanel) {
        setActiveInspectorPanel('variants');
      }
      return nextOpen;
    });
  };

  const resetMiniMapTransform = () => {
    if (!data.scene.miniMap) {
      return;
    }

    setMiniMapTransform(createDefaultMiniMapTransform(data.scene.miniMap.imageTransform));
    setMiniMapCopyNote('已重置为当前配置。');
  };

  const copyMiniMapTransform = async () => {
    if (!miniMapTransform) {
      return;
    }

    try {
      await window.navigator.clipboard.writeText(
        serializeMiniMapTransform(miniMapTransform)
      );
      setMiniMapCopyNote('已复制，可直接贴给我。');
    } catch {
      setMiniMapCopyNote('复制失败了，但面板参数就是当前值。');
    }
  };

  useEffect(() => {
    setVariantPanel(viewerConfig.initialVariantPanel);
    setPresetPanel(viewerConfig.initialPresetPanel);
    setRouteControls(viewerConfig.initialRouteControls);
  }, [setPresetPanel, setRouteControls, setVariantPanel, viewerConfig]);

  useEffect(() => {
    setMiniMapTransform(
      data.scene.miniMap
        ? createDefaultMiniMapTransform(data.scene.miniMap.imageTransform)
        : null
    );
    setMiniMapCopyNote('调到对齐后，点“复制参数”。');
  }, [data.scene.miniMap]);

  useEffect(() => {
    const compactViewportQuery = window.matchMedia('(max-width: 760px)');
    const touchViewportQuery = window.matchMedia('(hover: none) and (pointer: coarse)');

    const syncViewportState = () => {
      const nextIsMobileViewport =
        compactViewportQuery.matches || touchViewportQuery.matches;
      setIsMobileViewport(nextIsMobileViewport);
      if (!nextIsMobileViewport) {
        setIsMobilePanelOpen(false);
      }
    };

    syncViewportState();
    compactViewportQuery.addEventListener('change', syncViewportState);
    touchViewportQuery.addEventListener('change', syncViewportState);

    return () => {
      compactViewportQuery.removeEventListener('change', syncViewportState);
      touchViewportQuery.removeEventListener('change', syncViewportState);
    };
  }, []);

  return (
    <main className="shell">
      <div className="scene" ref={sceneContainerRef} />
      <HighlightLayer highlights={data.highlights ?? []} />
      <LoadingOverlay />
      <div className={`hud${isMobileViewport ? ' is-mobile-mode' : ''}`}>
        <aside className="rail rail-primary">
          <div className="rail-hero">
            <HeroPanel
              compact={isProductionUi || isMobileViewport}
              subtitle={data.scene.subtitle}
              title={data.scene.title}
            />
          </div>
          <div
            className={`panel panel-reveal inspector sidebar-panel${isMobileViewport ? ' is-mobile-hidden' : ''}`}
          >
            <ViewerInspectorPanels
              activeInspectorPanel={activeInspectorPanel}
              copyMiniMapTransform={copyMiniMapTransform}
              miniMapCopyNote={miniMapCopyNote}
              miniMapTransform={viewerConfig.showExperimentalControls ? miniMapTransform : null}
              onTogglePanel={toggleInspectorPanel}
              onMiniMapTransformChange={setMiniMapTransform}
              resetMiniMapTransform={resetMiniMapTransform}
              viewerConfig={viewerConfig}
            />
          </div>
        </aside>

        <div />

        <aside className="detail detail-map-only">
          {data.scene.miniMap ? (
            <div className="detail-map">
              <CameraMiniMap
                map={data.scene.miniMap}
                imageTransform={miniMapTransform ?? undefined}
                position={camera.positionValue}
                target={camera.targetValue}
                visibleGroundPolygon={camera.visibleGroundPolygonValue}
                yawDeg={camera.yawValue}
                distance={camera.distanceValue}
              />
            </div>
          ) : null}
        </aside>
      </div>

      {isMobileViewport ? (
        <Sheet
          open={isMobilePanelOpen}
          onOpenChange={setIsMobilePanelOpen}
        >
          <Button
            aria-expanded={isMobilePanelOpen}
            className={`mobile-panel-toggle${isMobilePanelOpen ? ' is-open' : ''}`}
            onClick={toggleMobilePanel}
            onMouseDown={stopInteractionPropagation}
            onPointerDown={stopInteractionPropagation}
            onTouchStart={stopInteractionPropagation}
            variant="floating"
          >
            <span className="mobile-panel-toggle-label">场景控制</span>
            <strong className="mobile-panel-toggle-value">
              {activeInspectorPanel === 'presets' ? '导览镜头' : '模型版本'}
            </strong>
          </Button>
          <SheetContent
            aria-label="移动端场景控制面板"
            className="sidebar-panel is-mobile-panel is-mobile-open"
            onMouseDown={stopInteractionPropagation}
            onPointerDown={stopInteractionPropagation}
            onTouchStart={stopInteractionPropagation}
            onTouchMove={stopInteractionPropagation}
            onWheel={stopInteractionPropagation}
          >
            <ViewerInspectorPanels
              activeInspectorPanel={activeInspectorPanel}
              copyMiniMapTransform={copyMiniMapTransform}
              miniMapCopyNote={miniMapCopyNote}
              miniMapTransform={viewerConfig.showExperimentalControls ? miniMapTransform : null}
              onTogglePanel={toggleInspectorPanel}
              onMiniMapTransformChange={setMiniMapTransform}
              resetMiniMapTransform={resetMiniMapTransform}
              viewerConfig={viewerConfig}
            />
          </SheetContent>
        </Sheet>
      ) : null}

      {viewerConfig.showPerfHud ? (
        <aside className="perf-hud" aria-live="polite">
          <span className="perf-chip">
            FPS <strong>{perfHud.fps}</strong>
          </span>
          <span className="perf-chip">
            帧时 <strong>{perfHud.ms}</strong>
          </span>
          <span className="perf-chip">
            渲染 <strong>{perfHud.render}</strong>
          </span>
          <span className="perf-chip">
            比例 <strong>{perfHud.scale}</strong>
          </span>
          <span className="perf-chip">
            图形 <strong>{perfHud.backend}</strong>
          </span>
          <span className="perf-chip">
            GPU <strong>{perfHud.gpu}</strong>
          </span>
        </aside>
      ) : null}
    </main>
  );
}

export {
  App
};
