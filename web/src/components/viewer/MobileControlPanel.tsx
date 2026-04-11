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
  const isDevUi = viewerConfig.showExperimentalControls;
  const panelNote = isDevUi
    ? '开发模式保留完整调试项，但交互仍和正式版一致。'
    : '用折叠 section 挑需要的信息，把更多空间留给场景。';
  const headerKicker = isDevUi ? '开发模式' : '场景控制';

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
    <div className="mobile-sheet-shell">
      <div className="mobile-sheet-header">
        <div className="mobile-sheet-handle" />
        <div className="mobile-sheet-copy">
          <span className="mobile-sheet-kicker">{headerKicker}</span>
          <strong>场景控制</strong>
          <p>{panelNote}</p>
        </div>
      </div>

      <div className="mobile-sheet-scroll" ref={scrollRef}>
        <section className="mobile-sheet-panel">
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
