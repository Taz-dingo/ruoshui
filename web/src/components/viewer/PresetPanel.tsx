import type { PresetPanelViewState } from '../../ui/state/types';
import { useViewerUiStore } from '../../ui/state/viewer-ui-store';
import { requestPresetSelection } from '../../ui/commands/viewer-command-bus';
import { ItemCardButton } from '../ui/item-card-button';

interface PresetPanelProps {
  initialState: PresetPanelViewState;
}

function PresetPanel({ initialState }: PresetPanelProps) {
  const state = useViewerUiStore((store) => store.presetPanel ?? initialState);

  return (
    <div className="preset-list">
      {state.items.map((item) => (
        <ItemCardButton
          key={item.id}
          body={item.summary}
          isActive={item.isActive}
          onClick={() => requestPresetSelection(item.id)}
          title={item.name}
        />
      ))}
    </div>
  );
}

export {
  PresetPanel
};
