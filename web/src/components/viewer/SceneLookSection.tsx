import { useEffect, useState } from 'react';

import { useViewerUiStore } from '../../ui/state/viewer-ui-store';
import { requestSceneLookChange } from '../../ui/commands/viewer-command-bus';
import { InspectorSection } from '../ui/inspector-section';

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
    <InspectorSection
      isOpen={isOpen}
      onToggle={onToggle}
      panelId="scene-look"
      summary={sceneLook.summary}
      title="画面表现"
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
    </InspectorSection>
  );
}

export {
  SceneLookSection
};
