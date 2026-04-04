import { useEffect, useState } from 'react';

import { useViewerUiStore } from '../../ui/state/viewer-ui-store';
import { requestSceneLookChange } from '../../ui/commands/viewer-command-bus';
import { InspectorSection } from '../ui/inspector-section';
import { SliderField } from '../ui/slider-field';

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

  const controls = [
    {
      id: 'brightness',
      label: '亮度',
      max: 140,
      min: 80,
      value: draftSceneLook.brightnessPercent,
      valueLabel: sceneLook.brightnessValue,
      onChange: (nextValue: number) => {
        const nextSceneLook = {
          brightnessPercent: nextValue,
          contrastPercent: draftSceneLook.contrastPercent,
          saturationPercent: draftSceneLook.saturationPercent
        };
        setDraftSceneLook(nextSceneLook);
        requestSceneLookChange(nextSceneLook);
      }
    },
    {
      id: 'contrast',
      label: '对比',
      max: 130,
      min: 80,
      value: draftSceneLook.contrastPercent,
      valueLabel: sceneLook.contrastValue,
      onChange: (nextValue: number) => {
        const nextSceneLook = {
          brightnessPercent: draftSceneLook.brightnessPercent,
          contrastPercent: nextValue,
          saturationPercent: draftSceneLook.saturationPercent
        };
        setDraftSceneLook(nextSceneLook);
        requestSceneLookChange(nextSceneLook);
      }
    },
    {
      id: 'saturation',
      label: '饱和',
      max: 140,
      min: 70,
      value: draftSceneLook.saturationPercent,
      valueLabel: sceneLook.saturationValue,
      onChange: (nextValue: number) => {
        const nextSceneLook = {
          brightnessPercent: draftSceneLook.brightnessPercent,
          contrastPercent: draftSceneLook.contrastPercent,
          saturationPercent: nextValue
        };
        setDraftSceneLook(nextSceneLook);
        requestSceneLookChange(nextSceneLook);
      }
    }
  ];

  return (
    <InspectorSection
      isOpen={isOpen}
      onToggle={onToggle}
      panelId="scene-look"
      summary={sceneLook.summary}
      title="画面表现"
    >
      <div className="scene-look-controls">
        {controls.map((control) => (
          <SliderField
            key={control.id}
            label={control.label}
            max={control.max}
            min={control.min}
            step="1"
            value={control.value}
            valueLabel={control.valueLabel}
            onChange={(event) => {
              control.onChange(Number(event.currentTarget.value));
            }}
          />
        ))}
      </div>
    </InspectorSection>
  );
}

export {
  SceneLookSection
};
