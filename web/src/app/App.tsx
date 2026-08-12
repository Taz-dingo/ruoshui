import { useEffect, useState } from 'react';

import { CommunitySheet } from '../components/community/CommunitySheet';
import { HighlightLayer } from '../components/viewer/HighlightLayer';
import { LoadingOverlay } from '../components/viewer/LoadingOverlay';
import { MobileControlPanel } from '../components/viewer/MobileControlPanel';
import { ViewerInspectorPanels } from '../components/viewer/ViewerInspectorPanels';
import { Sheet, SheetContent } from '../components/ui/sheet';
import {
  appShellClassNames,
  scrollAreaClassNames
} from '../styles/system';
import { useViewerUiStore } from '../ui/state/viewer-ui-store';
import { cn } from '../utils/cn';
import type { ViewerConfig } from './viewer-config';
import type { ViewerContent } from '../content/types';

interface AppProps {
  data: ViewerContent;
  viewerConfig: ViewerConfig;
}

const communitySceneId = 'ruoshui-main';

const hudClassName = cn(
  'pointer-events-none relative z-[4] grid h-full min-h-0 grid-cols-[var(--rail-left-width)_minmax(0,1fr)] gap-4 overflow-hidden p-4',
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
  'pointer-events-auto w-full rounded-[26px] border border-ink/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.13),rgba(12,13,16,0.32))] px-0 py-2 opacity-100 shadow-none backdrop-blur-[24px] saturate-[1.1] transition-[opacity,transform,background-color,border-color,backdrop-filter] duration-180 ease-out',
  scrollAreaClassNames.thin,
  'hover:border-outline/20 hover:bg-surface/64 hover:backdrop-blur-[10px] focus-within:border-outline/20 focus-within:bg-surface/64 focus-within:backdrop-blur-[10px]',
  '[max-height:calc(var(--app-height)-2rem)] max-[760px]:w-[min(calc(100vw-1.5rem),320px)] max-[760px]:max-h-[min(calc(var(--app-height)*0.46),380px)]'
);
const mobileSheetClassName = cn(
  'fixed z-[7] left-[calc(0.45rem+var(--safe-left))] right-[calc(0.45rem+var(--safe-right))] bottom-[calc(0.35rem+var(--safe-bottom))] h-[min(calc(var(--app-height)*0.78),680px)] max-h-none overflow-hidden rounded-[28px] border border-ink/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(10,11,14,0.88))] px-0 py-0 shadow-panel backdrop-blur-[28px] saturate-[1.1] [touch-action:pan-y] overscroll-none',
  'data-[state=closed]:pointer-events-none data-[state=closed]:animate-[ruoshui-sheet-bottom-out_220ms_cubic-bezier(0.4,0,1,1)_forwards] data-[state=open]:pointer-events-auto data-[state=open]:animate-[ruoshui-sheet-bottom-in_340ms_cubic-bezier(0.16,1,0.3,1)_forwards]'
);

function stopInteractionPropagation(event: {
  stopPropagation: () => void;
  preventDefault?: () => void;
}) {
  event.stopPropagation();
}

function App({
  data,
  viewerConfig
}: AppProps) {
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [activeInspectorPanel, setActiveInspectorPanel] = useState<string | null>(null);
  const [isCommunityOpen, setIsCommunityOpen] = useState(false);
  const setVariantPanel = useViewerUiStore((store) => store.setVariantPanel);
  const setPresetPanel = useViewerUiStore((store) => store.setPresetPanel);
  const setRouteControls = useViewerUiStore((store) => store.setRouteControls);
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

  const openFullCommunity = () => {
    setIsCommunityOpen(true);
  };

  useEffect(() => {
    setVariantPanel(viewerConfig.initialVariantPanel);
    setPresetPanel(viewerConfig.initialPresetPanel);
    setRouteControls(viewerConfig.initialRouteControls);
  }, [setPresetPanel, setRouteControls, setVariantPanel, viewerConfig]);

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
          id="hud-root"
          className={appShellClassNames.hudRoot}
        >
          <HighlightLayer
            highlights={data.highlights ?? []}
            onOpenFullCommunity={openFullCommunity}
            sceneId={communitySceneId}
          />
          <LoadingOverlay />

          <div className={hudClassName}>
            <aside className={cn(railClassName, 'self-start max-[760px]:relative max-[760px]:z-[1]')}>
              <div
                className={cn(
                  sidebarPanelClassName,
                  isMobileViewport && 'hidden'
                )}
              >
                <ViewerInspectorPanels
                  activeInspectorPanel={activeInspectorPanel}
                  copyMiniMapTransform={() => undefined}
                  hasMiniMap={false}
                  isMapVisible={false}
                  isMobile={false}
                  miniMapCopyNote="地图已从界面隐藏。"
                  miniMapTransform={null}
                  onMapVisibilityChange={() => undefined}
                  onPrimaryAction={undefined}
                  onTogglePanel={toggleInspectorPanel}
                  onMiniMapTransformChange={() => undefined}
                  resetMiniMapTransform={() => undefined}
                  viewerConfig={viewerConfig}
                />
              </div>
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
                className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/18 bg-[rgba(255,255,255,0.12)] p-0 text-center text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_22px_rgba(0,0,0,0.24)] backdrop-blur-[18px] [touch-action:manipulation]"
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
                copyMiniMapTransform={() => undefined}
                hasMiniMap={false}
                isMapVisible={false}
                isOpen={isMobilePanelOpen}
                miniMapCopyNote="地图已从界面隐藏。"
                miniMapTransform={null}
                onMapVisibilityChange={() => undefined}
                onActionComplete={dismissMobilePanel}
                onMiniMapTransformChange={() => undefined}
                onToggleInspectorPanel={toggleInspectorPanel}
                resetMiniMapTransform={() => undefined}
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
