import type { RouteControlsViewState } from '../ui/types';
import { useViewerUiStore } from '../ui/viewer-ui-store';
import {
  requestRouteSelection,
  requestRunCurrentRouteBenchmark,
  requestRunRouteSuite
} from '../ui/viewer-command-bus';

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
          <button
            key={item.id}
            className={`route${item.isActive ? ' is-active' : ''}${item.isRunning ? ' is-running' : ''}`}
            type="button"
            disabled={item.disabled}
            onClick={() => requestRouteSelection(item.id)}
          >
            <strong>{item.name}</strong>
            <span>{item.summary}</span>
          </button>
        ))}
      </div>
      <div className="route-batch">
        <div className="route-batch-actions">
          <button
            className="button tertiary route-batch-button"
            type="button"
            disabled={state.runCurrentDisabled}
            onClick={() => requestRunCurrentRouteBenchmark()}
          >
            {state.runCurrentLabel}
          </button>
          <button
            className="button tertiary route-batch-button"
            type="button"
            disabled={state.runSuiteDisabled}
            onClick={() => requestRunRouteSuite()}
          >
            {state.runSuiteLabel}
          </button>
        </div>
        <span className="route-batch-note">{state.batchNote}</span>
      </div>
    </div>
  );
}

export {
  RouteControlsPanel
};
