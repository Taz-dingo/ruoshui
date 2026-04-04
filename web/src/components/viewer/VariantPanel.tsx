import type { VariantPanelViewState } from '../../ui/state/types';
import { useViewerUiStore } from '../../ui/state/viewer-ui-store';
import { requestVariantSelection } from '../../ui/commands/viewer-command-bus';
import { InspectorSection } from '../ui/inspector-section';

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
            <button
              key={item.id}
              className={`variant${item.isActive ? ' is-active' : ''}`}
              type="button"
              disabled={item.disabled}
              onClick={() => requestVariantSelection(item.id)}
            >
              <span className="variant-line">
                <strong>{item.name}</strong>
                <small>{item.meta}</small>
              </span>
            </button>
          ))}
        </div>
    </InspectorSection>
  );
}

export {
  VariantPanel
};
