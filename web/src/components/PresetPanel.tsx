import { useEffect, useState } from 'react';

import type { PresetPanelViewState } from '../types';
import {
  getPresetPanelState,
  presetSelectEventName,
  publishPresetPanelState,
  subscribePresetPanelState
} from '../ui/preset-panel-store';

interface PresetPanelProps {
  initialState: PresetPanelViewState;
}

export function PresetPanel({ initialState }: PresetPanelProps) {
  const [state, setState] = useState<PresetPanelViewState>(() => {
    return getPresetPanelState() ?? initialState;
  });

  useEffect(() => {
    if (!getPresetPanelState()) {
      publishPresetPanelState(initialState);
    }

    setState(getPresetPanelState() ?? initialState);
    return subscribePresetPanelState(setState);
  }, [initialState]);

  return (
    <div className="preset-list">
      {state.items.map((item) => (
        <button
          key={item.id}
          className={`preset${item.isActive ? ' is-active' : ''}`}
          type="button"
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent(presetSelectEventName, {
                detail: { presetId: item.id }
              })
            );
          }}
        >
          <strong>{item.name}</strong>
          <span>{item.summary}</span>
        </button>
      ))}
    </div>
  );
}
