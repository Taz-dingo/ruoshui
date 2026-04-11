import { DisplaySettingsSection } from './DisplaySettingsSection';
import { HighlightAuthoringSection } from './HighlightAuthoringSection';
import { PresetsSection } from './PresetsSection';
import { RenderScaleSection } from './RenderScaleSection';
import { SceneLookSection } from './SceneLookSection';
import { VariantPanel } from './VariantPanel';
import { CameraPanel } from './CameraPanel';
import { MiniMapAlignSection } from './MiniMapAlignSection';
import { ViewCaptureSection } from './ViewCaptureSection';
import type { ViewerConfig } from '../../app/viewer-config';
import type { MiniMapImageTransform } from '../../content/types';

interface ViewerInspectorPanelsProps {
  activeInspectorPanel: string | null;
  copyMiniMapTransform: () => void;
  hasMiniMap: boolean;
  isMapVisible: boolean;
  isMobile?: boolean;
  miniMapCopyNote: string;
  miniMapTransform: MiniMapImageTransform | null;
  onMapVisibilityChange: (isVisible: boolean) => void;
  onPrimaryAction?: () => void;
  onTogglePanel: (panelId: string) => void;
  onMiniMapTransformChange: (nextTransform: MiniMapImageTransform) => void;
  resetMiniMapTransform: () => void;
  viewerConfig: ViewerConfig;
}

function ViewerInspectorPanels({
  activeInspectorPanel,
  copyMiniMapTransform,
  hasMiniMap,
  isMapVisible,
  isMobile = false,
  miniMapCopyNote,
  miniMapTransform,
  onMapVisibilityChange,
  onPrimaryAction,
  onTogglePanel,
  onMiniMapTransformChange,
  resetMiniMapTransform,
  viewerConfig
}: ViewerInspectorPanelsProps) {
  return (
    <>
      <VariantPanel
        initialState={viewerConfig.initialVariantPanel}
        isOpen={activeInspectorPanel === 'variants'}
        onVariantSelect={onPrimaryAction}
        onToggle={() => onTogglePanel('variants')}
      />
      <PresetsSection
        isOpen={activeInspectorPanel === 'presets'}
        onPresetSelect={onPrimaryAction}
        onToggle={() => onTogglePanel('presets')}
        showDiagnostics={viewerConfig.showExperimentalControls && !isMobile}
        viewerConfig={viewerConfig}
      />
      {hasMiniMap ? (
        <DisplaySettingsSection
          isMapVisible={isMapVisible}
          isOpen={activeInspectorPanel === 'display-settings'}
          onMapVisibilityChange={onMapVisibilityChange}
          onToggle={() => onTogglePanel('display-settings')}
        />
      ) : null}
      {viewerConfig.showExperimentalControls && !isMobile ? (
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
          {miniMapTransform ? (
            <MiniMapAlignSection
              copyNote={miniMapCopyNote}
              isOpen={activeInspectorPanel === 'minimap-align'}
              onCopy={copyMiniMapTransform}
              onReset={resetMiniMapTransform}
              onToggle={() => onTogglePanel('minimap-align')}
              onTransformChange={onMiniMapTransformChange}
              transform={miniMapTransform}
            />
          ) : null}
          <ViewCaptureSection
            isOpen={activeInspectorPanel === 'view-capture'}
            onToggle={() => onTogglePanel('view-capture')}
          />
        </>
      ) : null}
      {viewerConfig.showExperimentalControls && !isMobile ? (
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
