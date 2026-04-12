import { requestCaptureCurrentViewSample, requestCapturePresetViewSamples, requestClearViewCapture, requestDownloadViewCaptureJson } from '../../ui/commands/viewer-command-bus';
import { useViewerUiStore } from '../../ui/state/viewer-ui-store';
import { Button } from '../ui/button';
import { InspectorSection } from '../ui/inspector-section';

interface ViewCaptureSectionProps {
  isOpen: boolean;
  onToggle: () => void;
}

function ViewCaptureSection({ isOpen, onToggle }: ViewCaptureSectionProps) {
  const state = useViewerUiStore((store) => store.viewCapture);

  return (
    <InspectorSection
      isOpen={isOpen}
      onToggle={onToggle}
      panelId="view-capture"
      summary={state.summary}
      title="视角采集"
    >
      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-2 max-[760px]:grid-cols-1">
          <Button
            disabled={state.isRunning}
            onClick={() => requestCaptureCurrentViewSample()}
            variant="tertiary"
          >
            采当前视角
          </Button>
          <Button
            disabled={state.isRunning}
            onClick={() => requestCapturePresetViewSamples()}
            variant="tertiary"
          >
            自动扫场景
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 max-[760px]:grid-cols-1">
          <Button
            disabled={state.itemCount === 0 || state.isRunning}
            onClick={() => requestDownloadViewCaptureJson()}
            variant="secondary"
          >
            下载 JSON
          </Button>
          <Button
            disabled={state.itemCount === 0 || state.isRunning}
            onClick={() => requestClearViewCapture()}
            variant="secondary"
          >
            清空
          </Button>
        </div>
        <div className="text-[11px] leading-[1.5] text-ink-muted/72">{state.note}</div>
        {state.items.length > 0 ? (
          <div className="grid gap-2">
            {state.items.map((item) => (
              <article className="grid gap-1 rounded-control border border-ink-muted/8 bg-ink/3 px-3 py-2.5" key={item.id}>
                <strong className="text-[11px] font-semibold text-ink">{item.label}</strong>
                <span className="text-[10px] leading-[1.45] text-ink-muted/72">{item.variantName}</span>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </InspectorSection>
  );
}

export {
  ViewCaptureSection
};
