import { InspectorSection } from '../ui/inspector-section';
import { Switch } from '../ui/switch';

interface DisplaySettingsSectionProps {
  isMapVisible: boolean;
  isOpen: boolean;
  onMapVisibilityChange: (isVisible: boolean) => void;
  onToggle: () => void;
}

function DisplaySettingsSection({
  isMapVisible,
  isOpen,
  onMapVisibilityChange,
  onToggle
}: DisplaySettingsSectionProps) {
  return (
    <InspectorSection
      isOpen={isOpen}
      onToggle={onToggle}
      panelId="display-settings"
      summary={isMapVisible ? '地图已显示' : '地图已隐藏'}
      title="界面元素"
    >
      <div className="quality-control">
        <label className="quality-toggle">
          <span>
            <strong>显示地图</strong>
            <small>右上角保留当前视角对应的顶视图。</small>
          </span>
          <Switch
            checked={isMapVisible}
            onCheckedChange={(checked) => {
              onMapVisibilityChange(checked);
            }}
          />
        </label>
      </div>
    </InspectorSection>
  );
}

export {
  DisplaySettingsSection
};
