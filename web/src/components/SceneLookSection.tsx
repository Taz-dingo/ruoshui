import { useViewerUiStore } from '../ui/viewer-ui-store';

interface SceneLookSectionProps {
  isOpen: boolean;
  onToggle: () => void;
}

function SceneLookSection({ isOpen, onToggle }: SceneLookSectionProps) {
  const requestSceneLookChange = useViewerUiStore(
    (store) => store.requestSceneLookChange
  );
  const sceneLook = useViewerUiStore((store) => store.sceneLook);

  return (
    <section className="inspector-section" data-panel="scene-look">
      <button
        className={`inspector-toggle${isOpen ? ' is-active' : ''}`}
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span className="section-title">画面表现</span>
        <span className="toggle-meta">{sceneLook.summary}</span>
      </button>
      <div
        className={`inspector-body${isOpen ? ' is-open' : ''}`}
        data-body="scene-look"
      >
        <div className="scene-look-controls">
          <label className="scene-look-control">
            <span>亮度</span>
            <input
              className="quality-slider"
              type="range"
              min="80"
              max="140"
              step="1"
              value={sceneLook.brightnessPercent}
              onChange={(event) =>
                requestSceneLookChange({
                  brightnessPercent: Number(event.currentTarget.value),
                  contrastPercent: sceneLook.contrastPercent,
                  saturationPercent: sceneLook.saturationPercent
                })
              }
            />
            <strong>{sceneLook.brightnessValue}</strong>
          </label>
          <label className="scene-look-control">
            <span>对比</span>
            <input
              className="quality-slider"
              type="range"
              min="80"
              max="130"
              step="1"
              value={sceneLook.contrastPercent}
              onChange={(event) =>
                requestSceneLookChange({
                  brightnessPercent: sceneLook.brightnessPercent,
                  contrastPercent: Number(event.currentTarget.value),
                  saturationPercent: sceneLook.saturationPercent
                })
              }
            />
            <strong>{sceneLook.contrastValue}</strong>
          </label>
          <label className="scene-look-control">
            <span>饱和</span>
            <input
              className="quality-slider"
              type="range"
              min="70"
              max="140"
              step="1"
              value={sceneLook.saturationPercent}
              onChange={(event) =>
                requestSceneLookChange({
                  brightnessPercent: sceneLook.brightnessPercent,
                  contrastPercent: sceneLook.contrastPercent,
                  saturationPercent: Number(event.currentTarget.value)
                })
              }
            />
            <strong>{sceneLook.saturationValue}</strong>
          </label>
        </div>
      </div>
    </section>
  );
}

export {
  SceneLookSection
};
