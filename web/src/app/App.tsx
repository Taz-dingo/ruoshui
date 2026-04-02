import type { RefObject } from 'react';
import { useEffect, useState } from 'react';

import { CameraPanel } from '../components/viewer/CameraPanel';
import { CameraMiniMap } from '../components/viewer/CameraMiniMap';
import { HeroPanel } from '../components/viewer/HeroPanel';
import { HighlightAuthoringSection } from '../components/viewer/HighlightAuthoringSection';
import { HighlightLayer } from '../components/viewer/HighlightLayer';
import { LoadingOverlay } from '../components/viewer/LoadingOverlay';
import { PresetsSection } from '../components/viewer/PresetsSection';
import { RenderScaleSection } from '../components/viewer/RenderScaleSection';
import { SceneLookSection } from '../components/viewer/SceneLookSection';
import { SceneMetaPanel } from '../components/viewer/SceneMetaPanel';
import { VariantPanel } from '../components/viewer/VariantPanel';
import { useViewerUiStore } from '../ui/state/viewer-ui-store';
import type { ViewerConfig } from './viewer-config';
import type { ViewerContent } from '../content/types';

interface AppProps {
  data: ViewerContent;
  sceneContainerRef: RefObject<HTMLDivElement | null>;
  viewerConfig: ViewerConfig;
}

function App({
  data,
  sceneContainerRef,
  viewerConfig
}: AppProps) {
  const [activeInspectorPanel, setActiveInspectorPanel] = useState<string | null>(null);
  const setVariantPanel = useViewerUiStore((store) => store.setVariantPanel);
  const setPresetPanel = useViewerUiStore((store) => store.setPresetPanel);
  const setRouteControls = useViewerUiStore((store) => store.setRouteControls);
  const camera = useViewerUiStore((store) => store.camera);
  const perfHud = useViewerUiStore((store) => store.perfHud);

  const toggleInspectorPanel = (panelId: string) => {
    setActiveInspectorPanel((currentPanelId) =>
      currentPanelId === panelId ? null : panelId
    );
  };

  useEffect(() => {
    setVariantPanel(viewerConfig.initialVariantPanel);
    setPresetPanel(viewerConfig.initialPresetPanel);
    setRouteControls(viewerConfig.initialRouteControls);
  }, [setPresetPanel, setRouteControls, setVariantPanel, viewerConfig]);

  return (
    <main className="shell">
      <div className="scene" ref={sceneContainerRef} />
      <HighlightLayer highlights={data.highlights ?? []} />
      <LoadingOverlay />
      <div className="hud">
        <section className="rail">
          <HeroPanel
            subtitle={data.scene.subtitle}
            title={data.scene.title}
          />
          <SceneMetaPanel />
        </section>

        <div />

        <aside className="detail">
          {data.scene.miniMap ? (
            <div className="detail-map">
              <CameraMiniMap
                map={data.scene.miniMap}
                position={camera.positionValue}
                target={camera.targetValue}
                yawDeg={camera.yawValue}
                distance={camera.distanceValue}
              />
            </div>
          ) : null}
          <div className="panel panel-reveal inspector">
            <VariantPanel
              initialState={viewerConfig.initialVariantPanel}
              isOpen={activeInspectorPanel === 'variants'}
              onToggle={() => toggleInspectorPanel('variants')}
            />
            <RenderScaleSection
              activeRenderScalePercent={viewerConfig.activeRenderScalePercent}
              isOpen={activeInspectorPanel === 'quality'}
              maxRenderScalePercent={viewerConfig.maxRenderScalePercent}
              onToggle={() => toggleInspectorPanel('quality')}
              renderScaleMinPercent={viewerConfig.renderScaleMinPercent}
            />
            <SceneLookSection
              isOpen={activeInspectorPanel === 'scene-look'}
              onToggle={() => toggleInspectorPanel('scene-look')}
            />
            <PresetsSection
              isOpen={activeInspectorPanel === 'presets'}
              onToggle={() => toggleInspectorPanel('presets')}
              viewerConfig={viewerConfig}
            />
            <CameraPanel
              isOpen={activeInspectorPanel === 'camera'}
              onToggle={() => toggleInspectorPanel('camera')}
            />
            <HighlightAuthoringSection
              isOpen={activeInspectorPanel === 'highlight-authoring'}
              onToggle={() => toggleInspectorPanel('highlight-authoring')}
            />
          </div>
        </aside>
      </div>

      {viewerConfig.showPerfHud ? (
        <aside className="perf-hud" aria-live="polite">
          <span className="perf-chip">
            FPS <strong>{perfHud.fps}</strong>
          </span>
          <span className="perf-chip">
            帧时 <strong>{perfHud.ms}</strong>
          </span>
          <span className="perf-chip">
            渲染 <strong>{perfHud.render}</strong>
          </span>
          <span className="perf-chip">
            比例 <strong>{perfHud.scale}</strong>
          </span>
          <span className="perf-chip">
            图形 <strong>{perfHud.backend}</strong>
          </span>
          <span className="perf-chip">
            GPU <strong>{perfHud.gpu}</strong>
          </span>
        </aside>
      ) : null}
    </main>
  );
}

export {
  App
};
