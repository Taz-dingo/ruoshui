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
      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-2 max-[760px]:grid-cols-1">
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

        <div className="grid gap-2">
          <strong className="text-[10px] uppercase tracking-[0.04em] text-ink-muted/58">最近落点</strong>
          <span className="text-[11px] leading-[1.5] text-ink-muted/72">{state.point}</span>
        </div>
        <div className="text-[11px] leading-[1.5] text-ink-muted/72">{state.note}</div>
        <pre className="m-0 max-h-52 overflow-auto rounded-control border border-ink-muted/8 bg-ink/3 px-3 py-2.5 text-[11px] leading-[1.5] whitespace-pre-wrap break-words text-ink/90">
          {state.jsonSnippet || '{\n  "id": "new-highlight"\n}'}
        </pre>
        <div className="text-[11px] leading-[1.5] text-ink-muted/72">{state.copyNote}</div>
      </div>
    </InspectorSection>
  );
}

export {
  HighlightAuthoringSection
};
