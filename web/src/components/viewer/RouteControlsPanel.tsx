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
  onRouteAction?: () => void;
}

function RouteControlsPanel({
  initialState,
  onRouteAction
}: RouteControlsPanelProps) {
  const state = useViewerUiStore((store) => store.routeControls ?? initialState);
  const sectionLabelClassName = 'text-[10px] uppercase tracking-[0.04em] text-ink-muted/58';
  const sectionValueClassName = 'text-[11px] font-semibold text-brand-strong max-[760px]:text-[var(--type-mobile-title)] max-[760px]:leading-[1.28]';

  return (
    <div className="mb-3 grid gap-2.5 border-b border-ink-muted/8 pb-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className={sectionLabelClassName}>对比轨迹</span>
        <strong className={sectionValueClassName}>{state.summary}</strong>
      </div>
      <div className="grid gap-2 max-[760px]:gap-[0.6rem]">
        {state.items.map((item) => (
          <ItemCardButton
            key={item.id}
            body={item.summary}
            disabled={item.disabled}
            isActive={item.isActive}
            isRunning={item.isRunning}
            onClick={() => {
              requestRouteSelection(item.id);
              onRouteAction?.();
            }}
            title={item.name}
          />
        ))}
      </div>
      <div className="grid gap-1.5">
        <div className="grid grid-cols-2 gap-2 max-[760px]:grid-cols-1">
          <Button
            className="w-full justify-center"
            disabled={state.runCurrentDisabled}
            onClick={() => {
              requestRunCurrentRouteBenchmark();
              onRouteAction?.();
            }}
            variant="tertiary"
          >
            {state.runCurrentLabel}
          </Button>
          <Button
            className="w-full justify-center"
            disabled={state.runSuiteDisabled}
            onClick={() => {
              requestRunRouteSuite();
              onRouteAction?.();
            }}
            variant="tertiary"
          >
            {state.runSuiteLabel}
          </Button>
        </div>
        <span className="text-[10px] leading-[1.45] text-ink-muted/72 max-[760px]:text-[var(--type-mobile-body)] max-[760px]:leading-[1.55]">
          {state.batchNote}
        </span>
      </div>
    </div>
  );
}

export {
  RouteControlsPanel
};
