import { useEffect, useState } from 'react';

import { CameraMiniMap } from '../components/viewer/CameraMiniMap';
import { CommunitySheet } from '../components/community/CommunitySheet';
import { HeroPanel } from '../components/viewer/HeroPanel';
import { HighlightLayer } from '../components/viewer/HighlightLayer';
import { LoadingOverlay } from '../components/viewer/LoadingOverlay';
import { MobileControlPanel } from '../components/viewer/MobileControlPanel';
import { ViewerInspectorPanels } from '../components/viewer/ViewerInspectorPanels';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent } from '../components/ui/sheet';
import {
  appShellClassNames,
  scrollAreaClassNames
} from '../styles/system';
import { useViewerUiStore } from '../ui/state/viewer-ui-store';
import { cn } from '../utils/cn';
import type { ViewerConfig } from './viewer-config';
import type {
  MiniMapImageTransform,
  ViewerContent
} from '../content/types';

interface AppProps {
  data: ViewerContent;
  viewerConfig: ViewerConfig;
}

const communityBootstrapUrl = import.meta.env.DEV
  ? 'http://127.0.0.1:8787/api/forum/bootstrap'
  : '/api/forum/bootstrap';
const communitySceneId = 'ruoshui-main';

const hudClassName = cn(
  'pointer-events-none relative z-[4] grid h-full min-h-0 grid-cols-[var(--rail-left-width)_minmax(0,1fr)_var(--rail-right-width)] gap-4 overflow-hidden p-4',
  'max-[1180px]:grid-cols-[minmax(320px,var(--rail-left-width))_minmax(0,1fr)] max-[1180px]:overflow-visible',
  'max-[760px]:block max-[760px]:h-full max-[760px]:overflow-hidden',
  'max-[760px]:[padding:calc(0.35rem+var(--safe-top))_calc(0.55rem+var(--safe-right))_calc(5.15rem+var(--safe-bottom))_calc(0.55rem+var(--safe-left))]'
);
const railClassName = cn(
  'flex min-h-0 w-full flex-col justify-start gap-3.5 self-stretch pr-1.5',
  scrollAreaClassNames.thin,
  'max-[1180px]:w-full max-[1180px]:overflow-visible max-[1180px]:pr-0',
  'max-[760px]:gap-3 max-[760px]:overflow-visible max-[760px]:pr-0 max-[760px]:w-[min(calc(100vw-9.25rem),320px)]'
);
const sidebarPanelClassName = cn(
  'pointer-events-auto w-full rounded-[24px] border border-transparent bg-transparent px-0 py-2 opacity-100 shadow-none backdrop-blur-[0px] transition-[opacity,transform,background-color,border-color,box-shadow,backdrop-filter] duration-180 ease-out',
  scrollAreaClassNames.thin,
  'hover:border-outline/20 hover:bg-surface/64 hover:shadow-panel hover:backdrop-blur-[10px] focus-within:border-outline/20 focus-within:bg-surface/64 focus-within:shadow-panel focus-within:backdrop-blur-[10px]',
  '[max-height:calc(var(--app-height)-2rem)] max-[760px]:w-[min(calc(100vw-1.5rem),320px)] max-[760px]:max-h-[min(calc(var(--app-height)*0.46),380px)]'
);
const mobileSheetClassName = cn(
  'fixed z-[7] left-[calc(0.45rem+var(--safe-left))] right-[calc(0.45rem+var(--safe-right))] bottom-[calc(0.35rem+var(--safe-bottom))] h-[min(calc(var(--app-height)*0.78),680px)] max-h-none overflow-hidden rounded-[28px] border border-outline/20 bg-[linear-gradient(180deg,rgba(57,43,35,0.97)_0%,rgba(31,25,21,0.95)_100%)] px-0 py-0 shadow-panel backdrop-blur-[22px] [touch-action:pan-y] overscroll-none',
  'data-[state=closed]:pointer-events-none data-[state=closed]:animate-[ruoshui-sheet-bottom-out_220ms_cubic-bezier(0.4,0,1,1)_forwards] data-[state=open]:pointer-events-auto data-[state=open]:animate-[ruoshui-sheet-bottom-in_340ms_cubic-bezier(0.16,1,0.3,1)_forwards]'
);

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
  viewerConfig
}: AppProps) {
  const isProductionUi = !viewerConfig.showExperimentalControls;
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [isMiniMapVisible, setIsMiniMapVisible] = useState(true);
  const [activeInspectorPanel, setActiveInspectorPanel] = useState<string | null>(null);
  const [isCommunityOpen, setIsCommunityOpen] = useState(false);
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

  const dismissMobilePanel = () => {
    setIsMobilePanelOpen(false);
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

  useEffect(() => {
    const abortController = new AbortController();

    void fetch(communityBootstrapUrl, {
      signal: abortController.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as { message?: string };
        console.info(
          '[ruoshui] forum-api connected',
          payload.message ??
            'Current page and forum-api are ready for community requests.'
        );
      })
      .catch((error: unknown) => {
        if (
          error instanceof DOMException &&
          error.name === 'AbortError'
        ) {
          return;
        }

        console.warn(
          '[ruoshui] forum-api handshake failed',
          error instanceof Error ? error.message : error
        );
      });

    return () => {
      abortController.abort();
    };
  }, []);

  return (
    <main className={appShellClassNames.main}>
      <div
        id="scene-shell"
        className={appShellClassNames.sceneShell}
      >
        <div
          id="scene-root"
          aria-hidden="true"
          className={appShellClassNames.sceneRoot}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(90deg,rgba(23,18,15,0.72)_0%,rgba(23,18,15,0.26)_34%,rgba(23,18,15,0.08)_58%,rgba(23,18,15,0.22)_100%),linear-gradient(180deg,rgba(36,28,22,0.06)_0%,rgba(23,18,15,0.44)_100%)] max-[760px]:bg-[linear-gradient(90deg,rgba(23,18,15,0.32)_0%,rgba(23,18,15,0.1)_24%,rgba(23,18,15,0.03)_52%,rgba(23,18,15,0.1)_100%),linear-gradient(180deg,rgba(36,28,22,0.03)_0%,rgba(23,18,15,0.22)_100%)]"
        />

        <div
          id="hud-root"
          className={appShellClassNames.hudRoot}
        >
          <HighlightLayer highlights={data.highlights ?? []} />
          <LoadingOverlay />

          <div className={hudClassName}>
            <aside className={cn(railClassName, 'self-start max-[760px]:relative max-[760px]:z-[1]')}>
              <div className="w-full px-[var(--rail-content-pad)] max-[760px]:grid max-[760px]:gap-2.5 max-[760px]:px-0">
                <HeroPanel
                  compact={isProductionUi || isMobileViewport}
                  subtitle={data.scene.subtitle}
                  title={data.scene.title}
                />
                <div className="mt-3 flex flex-wrap gap-2 max-[760px]:mt-0">
                  <Button
                    className="pointer-events-auto"
                    onClick={() => setIsCommunityOpen(true)}
                    variant="tertiary"
                  >
                    打开社区
                  </Button>
                </div>
              </div>

              <div
                className={cn(
                  sidebarPanelClassName,
                  isMobileViewport && 'hidden'
                )}
              >
                <ViewerInspectorPanels
                  activeInspectorPanel={activeInspectorPanel}
                  copyMiniMapTransform={copyMiniMapTransform}
                  hasMiniMap={data.scene.miniMap !== undefined}
                  isMapVisible={isMiniMapVisible}
                  isMobile={false}
                  miniMapCopyNote={miniMapCopyNote}
                  miniMapTransform={viewerConfig.showExperimentalControls ? miniMapTransform : null}
                  onMapVisibilityChange={setIsMiniMapVisible}
                  onPrimaryAction={undefined}
                  onTogglePanel={toggleInspectorPanel}
                  onMiniMapTransformChange={setMiniMapTransform}
                  resetMiniMapTransform={resetMiniMapTransform}
                  viewerConfig={viewerConfig}
                />
              </div>
            </aside>

            <div />

            <aside
              className={cn(
                'flex min-h-0 w-full flex-col justify-start gap-3.5 self-start justify-self-end items-end pr-1.5',
                scrollAreaClassNames.thin,
                'max-[1180px]:col-start-2 max-[1180px]:row-start-1 max-[1180px]:w-full max-[1180px]:items-end max-[1180px]:overflow-visible max-[1180px]:pr-0',
                'max-[760px]:absolute max-[760px]:right-[calc(0.55rem+var(--safe-right))] max-[760px]:top-[calc(0.35rem+var(--safe-top))] max-[760px]:z-[1] max-[760px]:w-auto max-[760px]:items-end max-[760px]:overflow-visible max-[760px]:pr-0'
              )}
            >
              {data.scene.miniMap && isMiniMapVisible ? (
                <div className="grid justify-items-end gap-2.5">
                  <div className="pointer-events-none flex w-full justify-end max-[760px]:w-auto">
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
                </div>
              ) : null}
            </aside>
          </div>
        </div>

        {isMobileViewport ? (
          <Sheet
            open={isMobilePanelOpen}
            onOpenChange={setIsMobilePanelOpen}
          >
            <div
              className={cn(
                'pointer-events-auto fixed right-[calc(0.45rem+var(--safe-right))] bottom-[calc(0.35rem+var(--safe-bottom))] z-[6] block opacity-82 transition-[opacity,transform,background-color,border-color] duration-180 ease-out',
                isMobilePanelOpen && 'pointer-events-none translate-y-[0.35rem] scale-[0.96] opacity-0'
              )}
            >
              <button
                aria-expanded={isMobilePanelOpen}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-muted/8 bg-[rgba(33,27,23,0.42)] p-0 text-center text-ink shadow-[inset_0_1px_0_rgba(255,246,232,0.03),0_10px_22px_rgba(10,8,7,0.16)] backdrop-blur-[14px] [touch-action:manipulation]"
                onClick={toggleMobilePanel}
                onMouseDown={stopInteractionPropagation}
                onPointerDown={stopInteractionPropagation}
                onTouchStart={stopInteractionPropagation}
                type="button"
              >
                <span className={cn('grid h-4 w-4 shrink-0 gap-[3px]', isMobilePanelOpen ? 'text-brand-strong/96' : 'text-ink-muted/72')} aria-hidden="true">
                  <span className="block h-[2px] rounded-full bg-current" />
                  <span className="block h-[2px] rounded-full bg-current" />
                  <span className="block h-[2px] rounded-full bg-current" />
                </span>
                <span className="sr-only">打开场景控制面板</span>
              </button>
            </div>

            <SheetContent
              aria-label="移动端场景控制面板"
              className={mobileSheetClassName}
              side="bottom"
            >
              <MobileControlPanel
                activeInspectorPanel={activeInspectorPanel}
                copyMiniMapTransform={copyMiniMapTransform}
                hasMiniMap={data.scene.miniMap !== undefined}
                isMapVisible={isMiniMapVisible}
                isOpen={isMobilePanelOpen}
                miniMapCopyNote={miniMapCopyNote}
                miniMapTransform={viewerConfig.showExperimentalControls ? miniMapTransform : null}
                onMapVisibilityChange={setIsMiniMapVisible}
                onActionComplete={dismissMobilePanel}
                onMiniMapTransformChange={setMiniMapTransform}
                onToggleInspectorPanel={toggleInspectorPanel}
                resetMiniMapTransform={resetMiniMapTransform}
                viewerConfig={viewerConfig}
              />
            </SheetContent>
          </Sheet>
        ) : null}

        {viewerConfig.showPerfHud ? (
          <aside className="pointer-events-none absolute bottom-4 right-4 z-[3] hidden max-w-80 flex-wrap justify-end gap-2 [@media(min-width:761px)]:flex [&_strong]:text-[11px] [&_strong]:font-semibold [&_strong]:text-brand-strong" aria-live="polite">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-transparent px-[9px] py-1.5 text-[10px] uppercase tracking-[0.04em] text-ink/76">
              FPS <strong>{perfHud.fps}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-transparent px-[9px] py-1.5 text-[10px] uppercase tracking-[0.04em] text-ink/76">
              帧时 <strong>{perfHud.ms}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-transparent px-[9px] py-1.5 text-[10px] uppercase tracking-[0.04em] text-ink/76">
              渲染 <strong>{perfHud.render}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-transparent px-[9px] py-1.5 text-[10px] uppercase tracking-[0.04em] text-ink/76">
              比例 <strong>{perfHud.scale}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-transparent px-[9px] py-1.5 text-[10px] uppercase tracking-[0.04em] text-ink/76">
              图形 <strong>{perfHud.backend}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-transparent px-[9px] py-1.5 text-[10px] uppercase tracking-[0.04em] text-ink/76">
              GPU <strong>{perfHud.gpu}</strong>
            </span>
          </aside>
        ) : null}
      </div>

      <CommunitySheet
        isMobile={isMobileViewport}
        open={isCommunityOpen}
        onOpenChange={setIsCommunityOpen}
        sceneAssetUrl={viewerConfig.defaultVariant.assetUrl}
        sceneId={communitySceneId}
        scenePreviewImage={data.scene.miniMap?.imageUrl}
        sceneSummary={data.scene.summary}
        sceneTitle={data.scene.title}
      />
    </main>
  );
}

export {
  App
};
