import { useEffect, useRef } from 'react';

import type { ViewerConfig } from '../../app/viewer-config';
import type { MiniMapImageTransform } from '../../content/types';
import { ViewerInspectorPanels } from './ViewerInspectorPanels';

interface MobileControlPanelProps {
  activeInspectorPanel: string | null;
  copyMiniMapTransform: () => void;
  hasMiniMap: boolean;
  isMapVisible: boolean;
  isOpen: boolean;
  miniMapCopyNote: string;
  miniMapTransform: MiniMapImageTransform | null;
  onMapVisibilityChange: (isVisible: boolean) => void;
  onActionComplete?: () => void;
  onToggleInspectorPanel: (panelId: string) => void;
  onMiniMapTransformChange: (nextTransform: MiniMapImageTransform) => void;
  resetMiniMapTransform: () => void;
  viewerConfig: ViewerConfig;
}

function MobileControlPanel({
  activeInspectorPanel,
  copyMiniMapTransform,
  hasMiniMap,
  isMapVisible,
  isOpen,
  miniMapCopyNote,
  miniMapTransform,
  onMapVisibilityChange,
  onActionComplete,
  onToggleInspectorPanel,
  onMiniMapTransformChange,
  resetMiniMapTransform,
  viewerConfig
}: MobileControlPanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    scrollRef.current?.scrollTo({
      top: 0,
      behavior: 'auto'
    });
  }, [activeInspectorPanel, isOpen]);

  return (
    <div className="grid h-full grid-rows-[auto_minmax(0,1fr)]">
      <div className="relative z-[1] border-b border-ink-muted/6 bg-[linear-gradient(180deg,rgba(54,40,32,0.96)_0%,rgba(54,40,32,0.92)_100%)] px-0 pb-2 pt-2 shadow-[inset_0_-1px_0_rgba(255,246,232,0.03)]">
        <div className="mx-auto h-1.5 w-10 rounded-full bg-ink-muted/18" />
      </div>

      <div
        className="min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [touch-action:pan-y] [&::-webkit-scrollbar]:hidden"
        ref={scrollRef}
      >
        <section className="px-0 pt-1.5 [padding-bottom:calc(0.9rem+var(--safe-bottom))]">
          <ViewerInspectorPanels
            activeInspectorPanel={activeInspectorPanel}
            copyMiniMapTransform={copyMiniMapTransform}
            hasMiniMap={hasMiniMap}
            isMapVisible={isMapVisible}
            isMobile={false}
            miniMapCopyNote={miniMapCopyNote}
            miniMapTransform={miniMapTransform}
            onMapVisibilityChange={onMapVisibilityChange}
            onPrimaryAction={onActionComplete}
            onTogglePanel={onToggleInspectorPanel}
            onMiniMapTransformChange={onMiniMapTransformChange}
            resetMiniMapTransform={resetMiniMapTransform}
            viewerConfig={viewerConfig}
          />
        </section>
      </div>
    </div>
  );
}

export {
  MobileControlPanel
};
