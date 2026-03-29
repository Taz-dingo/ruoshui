import { useViewerUiStore } from '../ui/viewer-ui-store';

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
  const renderScaleRequest = useViewerUiStore(
    (store) => store.renderScaleRequest
  );
  const requestRenderScaleChange = useViewerUiStore(
    (store) => store.requestRenderScaleChange
  );

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
            step="5"
            value={
              renderScaleRequest.sequence > 0
                ? renderScaleRequest.value
                : activeRenderScalePercent
            }
            onChange={(event) =>
              requestRenderScaleChange(Number(event.currentTarget.value))
            }
          />
          <div className="quality-meta">
            <strong>{renderScale.value}</strong>
            <span>{renderScale.note}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export {
  RenderScaleSection
};
