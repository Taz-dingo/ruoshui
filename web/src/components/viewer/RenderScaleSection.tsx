import { useEffect, useState } from 'react';

import { useViewerUiStore } from '../../ui/state/viewer-ui-store';
import {
  requestAntiAliasChange,
  requestRenderScaleChange
} from '../../ui/commands/viewer-command-bus';

interface RenderScaleSectionProps {
  activeRenderScalePercent: number;
  isOpen: boolean;
  maxRenderScalePercent: number;
  onToggle: () => void;
  renderScaleMinPercent: number;
}

function RenderScaleSection({
  activeRenderScalePercent,
  isOpen,
  maxRenderScalePercent,
  onToggle,
  renderScaleMinPercent
}: RenderScaleSectionProps) {
  const renderScale = useViewerUiStore((store) => store.renderScale);
  const [draftPercent, setDraftPercent] = useState(activeRenderScalePercent);

  useEffect(() => {
    const nextPercent = Number.parseInt(renderScale.summary, 10);
    if (Number.isFinite(nextPercent)) {
      setDraftPercent(nextPercent);
      return;
    }

    setDraftPercent(activeRenderScalePercent);
  }, [activeRenderScalePercent, renderScale.summary]);

  return (
    <section className="inspector-section" data-panel="quality">
      <button
        className={`inspector-toggle${isOpen ? ' is-active' : ''}`}
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span className="section-title">渲染清晰度</span>
        <span className="toggle-meta">{renderScale.summary}</span>
      </button>
      <div
        className={`inspector-body${isOpen ? ' is-open' : ''}`}
        data-body="quality"
      >
        <div className="quality-control">
          <input
            className="quality-slider"
            type="range"
            min={renderScaleMinPercent}
            max={maxRenderScalePercent}
            step="1"
            value={draftPercent}
            onChange={(event) => {
              const nextPercent = Number(event.currentTarget.value);
              setDraftPercent(nextPercent);
              requestRenderScaleChange(nextPercent);
            }}
          />
          <div className="quality-meta">
            <strong>{renderScale.value}</strong>
            <span>{renderScale.note}</span>
          </div>
          <label className="quality-toggle">
            <span>
              <strong>后处理抗锯齿</strong>
              <small>{renderScale.antiAliasSummary} · {renderScale.antiAliasNote}</small>
            </span>
            <input
              type="checkbox"
              checked={renderScale.antiAliasEnabled}
              disabled={!renderScale.antiAliasAvailable}
              onChange={(event) => {
                requestAntiAliasChange(event.currentTarget.checked);
              }}
            />
          </label>
        </div>
      </div>
    </section>
  );
}

export {
  RenderScaleSection
};
