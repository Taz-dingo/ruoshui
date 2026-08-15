import { useEffect, useRef } from 'react';

import type { ViewerConfig } from '../../app/viewer-config';
import { ControlDockMenu } from './ControlDockMenu';

interface MobileControlPanelProps {
  activeInspectorPanel: string | null;
  isOpen: boolean;
  onActionComplete?: () => void;
  viewerConfig: ViewerConfig;
}

function MobileControlPanel({
  activeInspectorPanel,
  isOpen,
  onActionComplete,
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
      <div className="relative z-[1] border-b border-ink/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] px-0 pb-2 pt-2 shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)] backdrop-blur-[18px]">
        <div className="mx-auto h-1.5 w-10 rounded-full bg-ink-muted/18" />
      </div>

      <div
        className="min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [touch-action:pan-y] [&::-webkit-scrollbar]:hidden"
        ref={scrollRef}
      >
        <section className="px-0 pt-1.5 [padding-bottom:calc(0.9rem+var(--safe-bottom))]">
          <ControlDockMenu
            menuId={activeInspectorPanel === 'presets' ? 'presets' : 'variants'}
            onActionComplete={onActionComplete}
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
