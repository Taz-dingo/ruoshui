import type { RouteControlsViewState } from '../../ui/state/types';
import { useViewerUiStore } from '../../ui/state/viewer-ui-store';
import {
  requestRouteSelection,
  requestRunCurrentRouteBenchmark,
  requestRunRouteSuite
} from '../../ui/commands/viewer-command-bus';
import { Button } from '../ui/button';
import { ItemCardButton } from '../ui/item-card-button';

interface RouteControlsPanelProps {
  initialState: RouteControlsViewState;
}

function RouteControlsPanel({ initialState }: RouteControlsPanelProps) {
  const state = useViewerUiStore((store) => store.routeControls ?? initialState);

  return (
    <div className="route-group">
      <div className="route-head">
        <span>对比轨迹</span>
        <strong>{state.summary}</strong>
      </div>
      <div className="route-list">
        {state.items.map((item) => (
          <ItemCardButton
            key={item.id}
            body={item.summary}
            disabled={item.disabled}
            isActive={item.isActive}
            isRunning={item.isRunning}
            onClick={() => requestRouteSelection(item.id)}
            title={item.name}
          />
        ))}
      </div>
      <div className="route-batch">
        <div className="route-batch-actions">
          <Button
            className="route-batch-button"
            disabled={state.runCurrentDisabled}
            onClick={() => requestRunCurrentRouteBenchmark()}
            variant="tertiary"
          >
            {state.runCurrentLabel}
          </Button>
          <Button
            className="route-batch-button"
            disabled={state.runSuiteDisabled}
            onClick={() => requestRunRouteSuite()}
            variant="tertiary"
          >
            {state.runSuiteLabel}
          </Button>
        </div>
        <span className="route-batch-note">{state.batchNote}</span>
      </div>
    </div>
  );
}

export {
  RouteControlsPanel
};
