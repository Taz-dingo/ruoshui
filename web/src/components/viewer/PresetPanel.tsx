import type { PresetPanelViewState } from '../../ui/state/types';
import { useViewerUiStore } from '../../ui/state/viewer-ui-store';
import { requestPresetSelection } from '../../ui/commands/viewer-command-bus';

interface PresetPanelProps {
  initialState: PresetPanelViewState;
}

function PresetPanel({ initialState }: PresetPanelProps) {
  const state = useViewerUiStore((store) => store.presetPanel ?? initialState);

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

export {
  PresetPanel
};
