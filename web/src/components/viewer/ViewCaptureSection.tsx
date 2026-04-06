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
      <div className="view-capture-panel">
        <div className="view-capture-actions">
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
        <div className="view-capture-actions">
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
        <div className="view-capture-note">{state.note}</div>
        {state.items.length > 0 ? (
          <div className="view-capture-list">
            {state.items.map((item) => (
              <article className="view-capture-item" key={item.id}>
                <strong>{item.label}</strong>
                <span>{item.variantName}</span>
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
