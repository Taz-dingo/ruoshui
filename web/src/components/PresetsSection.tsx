import { PresetPanel } from './PresetPanel';
import { RouteControlsPanel } from './RouteControlsPanel';
import { RouteDiagnosticsPanel } from './RouteDiagnosticsPanel';
import { useViewerUiStore } from '../ui/viewer-ui-store';
import type { ViewerConfig } from '../viewer-config';

interface PresetsSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  viewerConfig: ViewerConfig;
}

function PresetsSection({
  isOpen,
  onToggle,
  viewerConfig
}: PresetsSectionProps) {
  const presetPanel = useViewerUiStore(
    (store) => store.presetPanel ?? viewerConfig.initialPresetPanel
  );

  return (
    <section className="inspector-section" data-panel="presets">
      <button
        className={`inspector-toggle${isOpen ? ' is-active' : ''}`}
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span className="section-title">导览镜头</span>
        <span className="toggle-meta">{presetPanel.summary}</span>
      </button>
      <div
        className={`inspector-body${isOpen ? ' is-open' : ''}`}
        data-body="presets"
      >
        <RouteControlsPanel initialState={viewerConfig.initialRouteControls} />
        <RouteDiagnosticsPanel />
        <PresetPanel initialState={viewerConfig.initialPresetPanel} />
      </div>
    </section>
  );
}

export {
  PresetsSection
};
