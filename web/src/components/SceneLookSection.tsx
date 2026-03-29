import { useEffect, useState } from 'react';

import { useViewerUiStore } from '../ui/viewer-ui-store';
import { requestSceneLookChange } from '../ui/viewer-command-bus';

interface SceneLookSectionProps {
  isOpen: boolean;
  onToggle: () => void;
}

function SceneLookSection({ isOpen, onToggle }: SceneLookSectionProps) {
  const sceneLook = useViewerUiStore((store) => store.sceneLook);
  const [draftSceneLook, setDraftSceneLook] = useState({
    brightnessPercent: sceneLook.brightnessPercent,
    contrastPercent: sceneLook.contrastPercent,
    saturationPercent: sceneLook.saturationPercent
  });

  useEffect(() => {
    setDraftSceneLook({
      brightnessPercent: sceneLook.brightnessPercent,
      contrastPercent: sceneLook.contrastPercent,
      saturationPercent: sceneLook.saturationPercent
    });
  }, [
    sceneLook.brightnessPercent,
    sceneLook.contrastPercent,
    sceneLook.saturationPercent
  ]);

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
              value={draftSceneLook.brightnessPercent}
              onChange={(event) => {
                const nextSceneLook = {
                  brightnessPercent: Number(event.currentTarget.value),
                  contrastPercent: draftSceneLook.contrastPercent,
                  saturationPercent: draftSceneLook.saturationPercent
                };
                setDraftSceneLook(nextSceneLook);
                requestSceneLookChange(nextSceneLook);
              }}
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
              value={draftSceneLook.contrastPercent}
              onChange={(event) => {
                const nextSceneLook = {
                  brightnessPercent: draftSceneLook.brightnessPercent,
                  contrastPercent: Number(event.currentTarget.value),
                  saturationPercent: draftSceneLook.saturationPercent
                };
                setDraftSceneLook(nextSceneLook);
                requestSceneLookChange(nextSceneLook);
              }}
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
              value={draftSceneLook.saturationPercent}
              onChange={(event) => {
                const nextSceneLook = {
                  brightnessPercent: draftSceneLook.brightnessPercent,
                  contrastPercent: draftSceneLook.contrastPercent,
                  saturationPercent: Number(event.currentTarget.value)
                };
                setDraftSceneLook(nextSceneLook);
                requestSceneLookChange(nextSceneLook);
              }}
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
