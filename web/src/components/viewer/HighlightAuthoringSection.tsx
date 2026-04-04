import { useViewerUiStore } from '../../ui/state/viewer-ui-store';
import {
  requestCopyHighlightDraft,
  requestSetHighlightAuthoringEnabled,
  requestSetHighlightPlaneY
} from '../../ui/commands/viewer-command-bus';
import { Button } from '../ui/button';
import { InspectorSection } from '../ui/inspector-section';
import { SliderField } from '../ui/slider-field';

interface HighlightAuthoringSectionProps {
  isOpen: boolean;
  onToggle: () => void;
}

function HighlightAuthoringSection({
  isOpen,
  onToggle
}: HighlightAuthoringSectionProps) {
  const state = useViewerUiStore((store) => store.highlightAuthoring);

  return (
    <InspectorSection
      isOpen={isOpen}
      onToggle={onToggle}
      panelId="highlight-authoring"
      summary={state.summary}
      title="三维打点"
    >
      <div className="highlight-authoring-panel">
        <div className="highlight-authoring-actions">
          <Button
            variant={state.isEnabled ? 'secondary' : 'tertiary'}
            onClick={() => requestSetHighlightAuthoringEnabled(!state.isEnabled)}
          >
            {state.isEnabled ? '退出打点模式' : '进入打点模式'}
          </Button>
          <Button
            variant="tertiary"
            disabled={!state.jsonSnippet}
            onClick={() => requestCopyHighlightDraft()}
          >
            复制 JSON
          </Button>
        </div>

        <SliderField
          label="参考平面 Y"
          max="0.4"
          min="0"
          step="0.01"
          value={state.planeY}
          valueLabel={state.planeYValue}
          onChange={(event) =>
            requestSetHighlightPlaneY(Number(event.currentTarget.value))
          }
        />

        <div className="highlight-authoring-meta">
          <strong>最近落点</strong>
          <span>{state.point}</span>
        </div>
        <div className="highlight-authoring-note">{state.note}</div>
        <pre className="highlight-authoring-code">
          {state.jsonSnippet || '{\n  "id": "new-highlight"\n}'}
        </pre>
        <div className="highlight-authoring-copy-note">{state.copyNote}</div>
      </div>
    </InspectorSection>
  );
}

export {
  HighlightAuthoringSection
};
