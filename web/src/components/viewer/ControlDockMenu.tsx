import type { ViewerConfig } from '../../app/viewer-config';
import { requestVariantSelection } from '../../ui/commands/viewer-command-bus';
import { useViewerUiStore } from '../../ui/state/viewer-ui-store';
import { ItemCardButton } from '../ui/item-card-button';
import { PresetPanel } from './PresetPanel';

type ControlDockMenuId = 'presets' | 'variants';

interface ControlDockMenuProps {
  menuId: ControlDockMenuId;
  onActionComplete?: () => void;
  viewerConfig: ViewerConfig;
}

function ControlDockMenu({
  menuId,
  onActionComplete,
  viewerConfig
}: ControlDockMenuProps) {
  const variantPanel = useViewerUiStore(
    (store) => store.variantPanel ?? viewerConfig.initialVariantPanel
  );
  const presetPanel = useViewerUiStore(
    (store) => store.presetPanel ?? viewerConfig.initialPresetPanel
  );

  if (menuId === 'presets') {
    return (
      <div className="grid gap-3 p-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[10px] uppercase tracking-[0.18em] text-ink-muted/80">导览镜头</span>
          <strong className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-brand-strong/84">
            {presetPanel.summary}
          </strong>
        </div>
        <PresetPanel
          initialState={viewerConfig.initialPresetPanel}
          onPresetSelect={onActionComplete}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-3 p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.18em] text-ink-muted/80">模型版本</span>
        <strong className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-brand-strong/84">
          {variantPanel.summary}
        </strong>
      </div>
      <div className="grid grid-cols-2 gap-2 max-[760px]:grid-cols-1">
        {variantPanel.items.map((item) => (
          <ItemCardButton
            key={item.id}
            density="compact"
            disabled={item.disabled}
            isActive={item.isActive}
            meta={item.meta}
            onClick={() => {
              requestVariantSelection(item.id);
              onActionComplete?.();
            }}
            title={item.name}
          />
        ))}
      </div>
    </div>
  );
}

export {
  ControlDockMenu
};
