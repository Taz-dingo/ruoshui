import { PresetPanel } from './PresetPanel';
import { RouteControlsPanel } from './RouteControlsPanel';
import { RouteDiagnosticsPanel } from './RouteDiagnosticsPanel';
import { useViewerUiStore } from '../../ui/state/viewer-ui-store';
import type { ViewerConfig } from '../../app/viewer-config';
import { InspectorSection } from '../ui/inspector-section';

interface PresetsSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  onPresetSelect?: () => void;
  showDiagnostics: boolean;
  viewerConfig: ViewerConfig;
}

function PresetsSection({
  isOpen,
  onToggle,
  onPresetSelect,
  showDiagnostics,
  viewerConfig
}: PresetsSectionProps) {
  const presetPanel = useViewerUiStore(
    (store) => store.presetPanel ?? viewerConfig.initialPresetPanel
  );

  return (
    <InspectorSection
      isOpen={isOpen}
      onToggle={onToggle}
      panelId="presets"
      summary={presetPanel.summary}
      title="导览镜头"
    >
      {showDiagnostics ? (
        <>
          <RouteControlsPanel
            initialState={viewerConfig.initialRouteControls}
            onRouteAction={onPresetSelect}
          />
          <RouteDiagnosticsPanel />
        </>
      ) : null}
      <PresetPanel
        initialState={viewerConfig.initialPresetPanel}
        onPresetSelect={onPresetSelect}
      />
    </InspectorSection>
  );
}

export {
  PresetsSection
};
