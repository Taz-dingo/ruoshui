import type { VariantPanelViewState } from '../types';
import { useViewerUiStore } from '../ui/viewer-ui-store';

interface VariantPanelProps {
  initialState: VariantPanelViewState;
  isOpen: boolean;
  onToggle: () => void;
}

function VariantPanel({ initialState, isOpen, onToggle }: VariantPanelProps) {
  const state = useViewerUiStore((store) => store.variantPanel ?? initialState);
  const requestVariantSelection = useViewerUiStore((store) => store.requestVariantSelection);

  return (
    <section className="inspector-section variant-section" data-panel="variants">
      <button
        className={`inspector-toggle${isOpen ? ' is-active' : ''}`}
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span className="section-title">模型版本</span>
        <span className="toggle-meta">{state.summary}</span>
      </button>
      <div className={`inspector-body${isOpen ? ' is-open' : ''}`} data-body="variants">
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
      </div>
    </section>
  );
}

export {
  VariantPanel
};
