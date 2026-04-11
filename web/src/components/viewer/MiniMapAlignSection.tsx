import { Button } from '../ui/button';
import { InspectorSection } from '../ui/inspector-section';
import { SliderField } from '../ui/slider-field';
import { Switch } from '../ui/switch';
import type { MiniMapImageTransform } from '../../content/types';

interface MiniMapAlignSectionProps {
  copyNote: string;
  isOpen: boolean;
  onCopy: () => void;
  onReset: () => void;
  onToggle: () => void;
  onTransformChange: (nextTransform: MiniMapImageTransform) => void;
  transform: MiniMapImageTransform;
}

function MiniMapAlignSection({
  copyNote,
  isOpen,
  onCopy,
  onReset,
  onToggle,
  onTransformChange,
  transform
}: MiniMapAlignSectionProps) {
  const controls = [
    {
      id: 'rotationDeg',
      label: '旋转',
      min: -180,
      max: 180,
      step: 1,
      value: transform.rotationDeg ?? 0,
      valueLabel: `${Math.round(transform.rotationDeg ?? 0)}°`
    },
    {
      id: 'scale',
      label: '缩放',
      min: 0.4,
      max: 2.2,
      step: 0.01,
      value: transform.scale ?? 1,
      valueLabel: `${(transform.scale ?? 1).toFixed(2)}×`
    },
    {
      id: 'translateX',
      label: '水平偏移',
      min: -420,
      max: 420,
      step: 1,
      value: transform.translateX ?? 0,
      valueLabel: `${Math.round(transform.translateX ?? 0)}`
    },
    {
      id: 'translateY',
      label: '垂直偏移',
      min: -420,
      max: 420,
      step: 1,
      value: transform.translateY ?? 0,
      valueLabel: `${Math.round(transform.translateY ?? 0)}`
    }
  ] as const;

  return (
    <InspectorSection
      isOpen={isOpen}
      onToggle={onToggle}
      panelId="minimap-align"
      summary="开发态校准"
      title="地图对齐"
    >
      <div className="scene-look-controls">
        {controls.map((control) => (
          <SliderField
            key={control.id}
            label={control.label}
            max={control.max}
            min={control.min}
            step={control.step}
            value={control.value}
            valueLabel={control.valueLabel}
            onChange={(event) => {
              const nextValue = Number(event.currentTarget.value);
              onTransformChange({
                ...transform,
                [control.id]: nextValue
              });
            }}
          />
        ))}

        <label className="quality-toggle">
          <span>
            <strong>水平镜像</strong>
            <small>方向如果左右反了，先试这个。</small>
          </span>
          <Switch
            checked={transform.flipX ?? false}
            onCheckedChange={(checked) => {
              onTransformChange({
                ...transform,
                flipX: checked
              });
            }}
          />
        </label>

        <label className="quality-toggle">
          <span>
            <strong>垂直镜像</strong>
            <small>方向如果上下反了，再试这个。</small>
          </span>
          <Switch
            checked={transform.flipY ?? false}
            onCheckedChange={(checked) => {
              onTransformChange({
                ...transform,
                flipY: checked
              });
            }}
          />
        </label>

        <label className="quality-toggle">
          <span>
            <strong>坐标 X 反向</strong>
            <small>解决左右方向、左转右转感受不一致的问题。</small>
          </span>
          <Switch
            checked={transform.invertWorldX ?? false}
            onCheckedChange={(checked) => {
              onTransformChange({
                ...transform,
                invertWorldX: checked
              });
            }}
          />
        </label>

        <label className="quality-toggle">
          <span>
            <strong>坐标 Z 反向</strong>
            <small>解决前后/上下漂移方向不一致的问题。</small>
          </span>
          <Switch
            checked={transform.invertWorldZ ?? false}
            onCheckedChange={(checked) => {
              onTransformChange({
                ...transform,
                invertWorldZ: checked
              });
            }}
          />
        </label>

        <div className="minimap-align-actions">
          <Button onClick={onCopy} variant="secondary">
            复制参数
          </Button>
          <Button onClick={onReset} variant="ghost">
            重置
          </Button>
        </div>
        <p className="minimap-align-note">{copyNote}</p>
      </div>
    </InspectorSection>
  );
}

export {
  MiniMapAlignSection
};
