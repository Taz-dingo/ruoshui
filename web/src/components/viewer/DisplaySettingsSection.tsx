import { InspectorSection } from '../ui/inspector-section';
import { Switch } from '../ui/switch';
import { settingToggleClassNames } from '../../styles/system';

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
      <div className="grid gap-2 max-[760px]:gap-[0.6rem]">
        <label className={settingToggleClassNames.root}>
          <span className={settingToggleClassNames.body}>
            <strong className={settingToggleClassNames.label}>显示地图</strong>
            <small className={settingToggleClassNames.description}>右上角保留当前视角对应的顶视图。</small>
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
