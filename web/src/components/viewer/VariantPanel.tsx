import type { VariantPanelViewState } from '../../ui/state/types';
import { useViewerUiStore } from '../../ui/state/viewer-ui-store';
import { requestVariantSelection } from '../../ui/commands/viewer-command-bus';
import { InspectorSection } from '../ui/inspector-section';
import { ItemCardButton } from '../ui/item-card-button';

interface VariantPanelProps {
  initialState: VariantPanelViewState;
  isOpen: boolean;
  onToggle: () => void;
}

function VariantPanel({ initialState, isOpen, onToggle }: VariantPanelProps) {
  const state = useViewerUiStore((store) => store.variantPanel ?? initialState);

  return (
    <InspectorSection
      className="variant-section"
      isOpen={isOpen}
      onToggle={onToggle}
      panelId="variants"
      summary={state.summary}
      title="模型版本"
    >
      <div className="variant-list">
        {state.items.map((item) => (
          <ItemCardButton
            key={item.id}
            density="compact"
            disabled={item.disabled}
            isActive={item.isActive}
            meta={item.meta}
            onClick={() => requestVariantSelection(item.id)}
            title={item.name}
          />
        ))}
      </div>
    </InspectorSection>
  );
}

export {
  VariantPanel
};
