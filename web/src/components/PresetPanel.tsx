import type { PresetPanelViewState } from '../types';
import { useViewerUiStore } from '../ui/viewer-ui-store';

interface PresetPanelProps {
  initialState: PresetPanelViewState;
}

export function PresetPanel({ initialState }: PresetPanelProps) {
  const state = useViewerUiStore((store) => store.presetPanel ?? initialState);
  const requestPresetSelection = useViewerUiStore((store) => store.requestPresetSelection);

  return (
    <div className="preset-list">
      {state.items.map((item) => (
        <button
          key={item.id}
          className={`preset${item.isActive ? ' is-active' : ''}`}
          type="button"
          onClick={() => requestPresetSelection(item.id)}
        >
          <strong>{item.name}</strong>
          <span>{item.summary}</span>
        </button>
      ))}
    </div>
  );
}
