import { useEffect, useState } from 'react';

import type { VariantPanelViewState } from '../types';
import {
  getVariantPanelState,
  publishVariantPanelState,
  subscribeVariantPanelState,
  variantSelectEventName
} from '../ui/variant-panel-store';

interface VariantPanelProps {
  initialState: VariantPanelViewState;
}

export function VariantPanel({ initialState }: VariantPanelProps) {
  const [state, setState] = useState<VariantPanelViewState>(() => {
    return getVariantPanelState() ?? initialState;
  });

  useEffect(() => {
    if (!getVariantPanelState()) {
      publishVariantPanelState(initialState);
    }

    setState(getVariantPanelState() ?? initialState);
    return subscribeVariantPanelState(setState);
  }, [initialState]);

  return (
    <section className="inspector-section variant-section" data-panel="variants">
      <button className="inspector-toggle" type="button" data-toggle="variants" aria-expanded="false">
        <span className="section-title">模型版本</span>
        <span className="toggle-meta">{state.summary}</span>
      </button>
      <div className="inspector-body" data-body="variants">
        <div className="variant-list">
          {state.items.map((item) => (
            <button
              key={item.id}
              className={`variant${item.isActive ? ' is-active' : ''}`}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent(variantSelectEventName, {
                    detail: { variantId: item.id }
                  })
                );
              }}
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
