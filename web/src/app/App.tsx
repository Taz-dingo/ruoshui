import { useEffect, useState } from 'react';
import {
  safePolygon,
  useFloating,
  useHover,
  useInteractions
} from '@floating-ui/react';

import { AdminReviewConsole } from '../components/admin/AdminReviewConsole';
import { CommunitySheet } from '../components/community/CommunitySheet';
import { PlaceMemoryLayer } from '../components/community/PlaceMemoryLayer';
import { StoryComposerFlow } from '../components/community/StoryComposerFlow';
import { ControlDockMenu } from '../components/viewer/ControlDockMenu';
import { HighlightLayer } from '../components/viewer/HighlightLayer';
import { LoadingOverlay } from '../components/viewer/LoadingOverlay';
import { MobileControlPanel } from '../components/viewer/MobileControlPanel';
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

type DockMenuId = 'presets' | 'variants';

const communitySceneId = 'ruoshui-main';

const hudClassName = cn(
  'pointer-events-none relative z-[4] h-full min-h-0 overflow-hidden'
);
const dockMenuSurfaceClassName = cn(
  'w-full rounded-[26px] border border-ink/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.13),rgba(12,13,16,0.32))] px-0 py-2 opacity-100 shadow-none backdrop-blur-[24px] saturate-[1.1]',
  scrollAreaClassNames.thin,
  'max-h-[calc(var(--app-height)-7rem)]'
);
const dockPanelClassName = cn(
  'pointer-events-none invisible absolute bottom-[calc(100%+0.8rem)] left-1/2 w-[min(360px,calc(100vw-2rem))] -translate-x-1/2 translate-y-2 transition-transform duration-150 ease-out',
  'max-[760px]:hidden'
);
const dockButtonClassName =
  'pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-ink/18 bg-[rgba(14,16,20,0.58)] text-ink-muted/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_10px_22px_rgba(0,0,0,0.24)] backdrop-blur-[18px] transition-[border-color,background-color,color] duration-180 ease-out hover:border-brand/46 hover:bg-[rgba(26,30,34,0.72)] hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong/70';
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

function DockIcon({ kind }: { kind: 'model' | 'preset' }) {
  if (kind === 'model') {
    return (
      <svg aria-hidden="true" className="h-[19px] w-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4.4 7.7 7.6 4.4 7.6-4.4M12 12.1V21" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-[19px] w-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5 5.5-2.1Z" />
      <path d="M12 3.5v1.2M20.5 12h-1.2M12 19.3v1.2M4.7 12H3.5" />
    </svg>
  );
}

function StoryIcon() {
  return (
    <svg aria-hidden="true" className="h-[19px] w-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
      <path d="M5 19h4l9.6-9.6a2.1 2.1 0 0 0-3-3L6 16v3Z" />
      <path d="m13.9 8.1 3 3" />
    </svg>
  );
}

interface DockMenuProps {
  menuId: DockMenuId;
  onActionComplete?: () => void;
  onOpenChange: (open: boolean) => void;
  onTriggerClick: () => void;
  open: boolean;
  viewerConfig: ViewerConfig;
}

function DockMenu({
  menuId,
  onActionComplete,
  onOpenChange,
  onTriggerClick,
  open,
  viewerConfig
}: DockMenuProps) {
  const { context, refs } = useFloating({
    open,
    onOpenChange
  });
  const hover = useHover(context, {
    handleClose: safePolygon({ buffer: 1 }),
    mouseOnly: true
  });
  const { getFloatingProps, getReferenceProps } = useInteractions([hover]);
  const isVariants = menuId === 'variants';

  return (
    <div className="relative">
      <div
        {...getFloatingProps({
          className: cn(
            dockPanelClassName,
            open && 'pointer-events-auto visible translate-y-0'
          ),
          id: `dock-menu-${menuId}`,
          ref: refs.setFloating
        })}
      >
        <div className={dockMenuSurfaceClassName}>
          <ControlDockMenu
            menuId={menuId}
            onActionComplete={onActionComplete}
            viewerConfig={viewerConfig}
          />
        </div>
      </div>
      <button
        {...getReferenceProps({
          'aria-controls': `dock-menu-${menuId}`,
          'aria-expanded': open,
          'aria-haspopup': 'true',
          'aria-label': isVariants ? '打开模型版本菜单' : '打开导览镜头菜单',
          onClick: onTriggerClick
        })}
        ref={refs.setReference}
        className={dockButtonClassName}
        onMouseDown={stopInteractionPropagation}
        onPointerDown={stopInteractionPropagation}
        onTouchStart={stopInteractionPropagation}
        title={isVariants ? '模型版本' : '导览镜头'}
        type="button"
      >
        <DockIcon kind={isVariants ? 'model' : 'preset'} />
      </button>
    </div>
  );
}

function App({
  data,
  viewerConfig
}: AppProps) {
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [activeInspectorPanel, setActiveInspectorPanel] = useState<string | null>(null);
  const [openDockMenu, setOpenDockMenu] = useState<DockMenuId | null>(null);
  const [isCommunityOpen, setIsCommunityOpen] = useState(false);
  const [isStoryComposerOpen, setIsStoryComposerOpen] = useState(false);
  const setVariantPanel = useViewerUiStore((store) => store.setVariantPanel);
  const setPresetPanel = useViewerUiStore((store) => store.setPresetPanel);
  const setRouteControls = useViewerUiStore((store) => store.setRouteControls);
  const perfHud = useViewerUiStore((store) => store.perfHud);
  const isAdminReviewMode = new URLSearchParams(window.location.search).get('admin') === 'review';

  const dismissMobilePanel = () => {
    setIsMobilePanelOpen(false);
  };

  const openControlPanel = (panelId: string) => {
    setActiveInspectorPanel(panelId);
    if (isMobileViewport) {
      setIsMobilePanelOpen(true);
    }
  };

  const setDockMenuOpen = (menuId: DockMenuId, open: boolean) => {
    setOpenDockMenu((current) =>
      open ? menuId : current === menuId ? null : current
    );
  };

  const openFullCommunity = () => {
    setIsCommunityOpen(true);
  };

  const openStoryComposer = () => {
    setOpenDockMenu(null);
    setIsMobilePanelOpen(false);
    setIsCommunityOpen(false);
    setIsStoryComposerOpen(true);
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
          <PlaceMemoryLayer isMobile={isMobileViewport} sceneId={communitySceneId} />
          <LoadingOverlay />

          <div className={hudClassName}>
            <div
              className={cn(
                'pointer-events-none fixed bottom-[calc(1.5rem+var(--safe-bottom))] left-1/2 z-[6] flex -translate-x-1/2 items-end gap-2',
                isMobilePanelOpen && 'max-[760px]:pointer-events-none max-[760px]:opacity-0'
              )}
            >
              <DockMenu
                menuId="variants"
                onOpenChange={(open) => setDockMenuOpen('variants', open)}
                onTriggerClick={() => openControlPanel('variants')}
                open={openDockMenu === 'variants'}
                viewerConfig={viewerConfig}
              />
              <DockMenu
                menuId="presets"
                onOpenChange={(open) => setDockMenuOpen('presets', open)}
                onTriggerClick={() => openControlPanel('presets')}
                open={openDockMenu === 'presets'}
                viewerConfig={viewerConfig}
              />
              <button
                aria-label="留下你的故事"
                className={dockButtonClassName}
                onClick={openStoryComposer}
                onMouseDown={stopInteractionPropagation}
                onPointerDown={stopInteractionPropagation}
                onTouchStart={stopInteractionPropagation}
                title="留下故事"
                type="button"
              >
                <StoryIcon />
              </button>
            </div>
          </div>
        </div>

        {isMobileViewport ? (
          <Sheet
            open={isMobilePanelOpen}
            onOpenChange={setIsMobilePanelOpen}
          >
            <SheetContent
              aria-label="移动端场景控制面板"
              className={mobileSheetClassName}
              side="bottom"
            >
              <MobileControlPanel
                activeInspectorPanel={activeInspectorPanel}
                isOpen={isMobilePanelOpen}
                onActionComplete={dismissMobilePanel}
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
      <StoryComposerFlow
        onOpenChange={setIsStoryComposerOpen}
        open={isStoryComposerOpen}
        sceneId={communitySceneId}
      />
      {isAdminReviewMode ? <AdminReviewConsole sceneId={communitySceneId} /> : null}
    </main>
  );
}

export {
  App
};
