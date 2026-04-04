import { HighlightAuthoringSection } from './HighlightAuthoringSection';
import { PresetsSection } from './PresetsSection';
import { RenderScaleSection } from './RenderScaleSection';
import { SceneLookSection } from './SceneLookSection';
import { VariantPanel } from './VariantPanel';
import { CameraPanel } from './CameraPanel';
import type { ViewerConfig } from '../../app/viewer-config';

interface ViewerInspectorPanelsProps {
  activeInspectorPanel: string | null;
  onTogglePanel: (panelId: string) => void;
  viewerConfig: ViewerConfig;
}

function ViewerInspectorPanels({
  activeInspectorPanel,
  onTogglePanel,
  viewerConfig
}: ViewerInspectorPanelsProps) {
  return (
    <>
      <VariantPanel
        initialState={viewerConfig.initialVariantPanel}
        isOpen={activeInspectorPanel === 'variants'}
        onToggle={() => onTogglePanel('variants')}
      />
      <PresetsSection
        isOpen={activeInspectorPanel === 'presets'}
        onToggle={() => onTogglePanel('presets')}
        showDiagnostics={viewerConfig.showExperimentalControls}
        viewerConfig={viewerConfig}
      />
      {viewerConfig.showExperimentalControls ? (
        <>
          <RenderScaleSection
            activeRenderScalePercent={viewerConfig.activeRenderScalePercent}
            graphicsBackendPreference={viewerConfig.graphicsBackendPreference}
            isOpen={activeInspectorPanel === 'quality'}
            maxRenderScalePercent={viewerConfig.maxRenderScalePercent}
            onToggle={() => onTogglePanel('quality')}
            renderScaleMinPercent={viewerConfig.renderScaleMinPercent}
            showAdvancedControls={viewerConfig.showExperimentalControls}
          />
          <SceneLookSection
            isOpen={activeInspectorPanel === 'scene-look'}
            onToggle={() => onTogglePanel('scene-look')}
          />
          <CameraPanel
            isOpen={activeInspectorPanel === 'camera'}
            onToggle={() => onTogglePanel('camera')}
          />
        </>
      ) : null}
      {viewerConfig.showExperimentalControls ? (
        <HighlightAuthoringSection
          isOpen={activeInspectorPanel === 'highlight-authoring'}
          onToggle={() => onTogglePanel('highlight-authoring')}
        />
      ) : null}
    </>
  );
}

export {
  ViewerInspectorPanels
};
