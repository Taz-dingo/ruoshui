import { useViewerUiStore } from '../../ui/state/viewer-ui-store';
import {
  requestCopyHighlightDraft,
  requestSetHighlightAuthoringEnabled,
  requestSetHighlightPlaneY
} from '../../ui/commands/viewer-command-bus';
import { Button } from '../ui/button';
import { InspectorSection } from '../ui/inspector-section';

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

          <label className="scene-look-control">
            <span>参考平面 Y</span>
            <input
              className="quality-slider"
              type="range"
              min="0"
              max="0.4"
              step="0.01"
              value={state.planeY}
              onChange={(event) =>
                requestSetHighlightPlaneY(Number(event.currentTarget.value))
              }
            />
            <strong>{state.planeYValue}</strong>
          </label>

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
