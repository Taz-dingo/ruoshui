import { useEffect, useMemo } from 'react';

import { CameraPanel } from './components/CameraPanel';
import { PresetPanel } from './components/PresetPanel';
import { RouteControlsPanel } from './components/RouteControlsPanel';
import { RouteDiagnosticsPanel } from './components/RouteDiagnosticsPanel';
import { VariantPanel } from './components/VariantPanel';
import type { ViewerContent } from './types';
import { useViewerUiStore } from './ui/viewer-ui-store';

interface AppProps {
  data: ViewerContent;
  showPerfHud: boolean;
  maxRenderScalePercent: number;
  activeRenderScalePercent: number;
  renderScaleMinPercent: number;
}

function App({
  data,
  showPerfHud,
  maxRenderScalePercent,
  activeRenderScalePercent,
  renderScaleMinPercent
}: AppProps) {
  const defaultVariant = data.variants.find((variant) => variant.id === data.scene.defaultVariantId) ?? data.variants[0];
  const firstPreset = data.presets[0];
  const setVariantPanel = useViewerUiStore((store) => store.setVariantPanel);
  const setPresetPanel = useViewerUiStore((store) => store.setPresetPanel);
  const setRouteControls = useViewerUiStore((store) => store.setRouteControls);
  const status = useViewerUiStore((store) => store.status);
  const sceneMeta = useViewerUiStore((store) => store.sceneMeta);
  const sceneMetrics = useViewerUiStore((store) => store.sceneMetrics);
  const activeInspectorPanel = useViewerUiStore((store) => store.activeInspectorPanel);
  const renderScaleRequest = useViewerUiStore((store) => store.renderScaleRequest);
  const renderScale = useViewerUiStore((store) => store.renderScale);
  const requestPresetSelection = useViewerUiStore((store) => store.requestPresetSelection);
  const requestRenderScaleChange = useViewerUiStore((store) => store.requestRenderScaleChange);
  const requestSceneLookChange = useViewerUiStore((store) => store.requestSceneLookChange);
  const sceneLook = useViewerUiStore((store) => store.sceneLook);
  const setActiveInspectorPanel = useViewerUiStore((store) => store.setActiveInspectorPanel);
  const perfHud = useViewerUiStore((store) => store.perfHud);

  const initialVariantPanel = useMemo(() => ({
    summary: defaultVariant.name,
    items: data.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      meta: `${variant.size} · ${variant.retention}`,
      isActive: variant.id === defaultVariant.id,
      disabled: false
    }))
  }), [data.variants, defaultVariant.id, defaultVariant.name]);

  const initialPresetPanel = useMemo(() => ({
    summary: firstPreset.name,
    items: data.presets.map((preset) => ({
      id: preset.id,
      name: preset.name,
      summary: preset.summary,
      isActive: preset.id === firstPreset.id
    }))
  }), [data.presets, firstPreset.id, firstPreset.name]);
  const presetPanel = useViewerUiStore((store) => store.presetPanel ?? initialPresetPanel);

  const initialRouteControls = useMemo(() => ({
    summary: '未播放',
    batchNote: data.benchmarkRoutes?.[0]
      ? `${data.benchmarkRoutes[0].name} · 当前版本或 ${data.variants.length} 个版本`
      : '先选择一条轨迹，再批量跑所有版本。',
    runCurrentLabel: '跑当前轨迹 × 当前版本 ×3',
    runSuiteLabel: '跑当前轨迹 × 全版本',
    runCurrentDisabled: (data.benchmarkRoutes?.length ?? 0) === 0,
    runSuiteDisabled: (data.benchmarkRoutes?.length ?? 0) === 0,
    items: (data.benchmarkRoutes ?? []).map((route, index) => ({
      id: route.id,
      name: route.name,
      summary: route.summary,
      isActive: index === 0,
      isRunning: false,
      disabled: false
    }))
  }), [data.benchmarkRoutes, data.variants.length]);

  useEffect(() => {
    setVariantPanel(initialVariantPanel);
    setPresetPanel(initialPresetPanel);
    setRouteControls(initialRouteControls);
  }, [initialPresetPanel, initialRouteControls, initialVariantPanel, setPresetPanel, setRouteControls, setVariantPanel]);

  return (
    <main className="shell">
      <div className="scene" id="scene" />
      <div className="hud">
        <section className="rail">
          <div className="hero">
            <h1>{data.scene.title}</h1>
            <p className="hero-subtitle">{data.scene.subtitle}</p>
            <div className="hero-actions">
              <button className="button primary" type="button" onClick={() => requestPresetSelection(firstPreset.id)}>进入</button>
              <button className="button secondary" type="button" onClick={() => requestPresetSelection('hover')}>全览</button>
            </div>
          </div>

          <div className="panel panel-reveal meta-panel">
            <div className="status-strip" aria-live="polite">
              <span className="status-dot" />
              <div className="status-copy">
                <strong>{status.title}</strong>
                <span>{status.detail}</span>
              </div>
            </div>
            <div className="stats compact-stats">
              <div className="stat-card">
                <span>当前版本</span>
                <strong>{sceneMeta.title}</strong>
              </div>
              <div className="stat-card">
                <span>文件体积</span>
                <strong>{sceneMeta.size}</strong>
              </div>
              <div className="stat-card">
                <span>高斯数量</span>
                <strong>{sceneMeta.splats}</strong>
              </div>
              <div className="stat-card">
                <span>保留比例</span>
                <strong>{sceneMeta.retention}</strong>
              </div>
            </div>
            <p className="memory-body">{sceneMeta.note}</p>
            <div className="metrics-grid" aria-live="polite">
              <div className="metric-card">
                <span>加载</span>
                <strong>{sceneMetrics.load}</strong>
              </div>
              <div className="metric-card">
                <span>首帧</span>
                <strong>{sceneMetrics.firstFrame}</strong>
              </div>
              <div className="metric-card">
                <span>漫游</span>
                <strong>{sceneMetrics.motion}</strong>
              </div>
            </div>
          </div>
        </section>

        <div />

        <aside className="detail">
          <div className="panel panel-reveal inspector">
            <VariantPanel
              initialState={initialVariantPanel}
            />

            <section className="inspector-section" data-panel="quality">
              <button
                className={`inspector-toggle${activeInspectorPanel === 'quality' ? ' is-active' : ''}`}
                type="button"
                aria-expanded={activeInspectorPanel === 'quality'}
                onClick={() => setActiveInspectorPanel(activeInspectorPanel === 'quality' ? null : 'quality')}
              >
                <span className="section-title">渲染清晰度</span>
                <span className="toggle-meta">{renderScale.summary}</span>
              </button>
              <div className={`inspector-body${activeInspectorPanel === 'quality' ? ' is-open' : ''}`} data-body="quality">
                <div className="quality-control">
                  <input
                    className="quality-slider"
                    type="range"
                    min={renderScaleMinPercent}
                    max={maxRenderScalePercent}
                    step="5"
                    value={renderScaleRequest.sequence > 0 ? renderScaleRequest.value : activeRenderScalePercent}
                    onChange={(event) => requestRenderScaleChange(Number(event.currentTarget.value))}
                  />
                  <div className="quality-meta">
                    <strong>{renderScale.value}</strong>
                    <span>{renderScale.note}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="inspector-section" data-panel="scene-look">
              <button
                className={`inspector-toggle${activeInspectorPanel === 'scene-look' ? ' is-active' : ''}`}
                type="button"
                aria-expanded={activeInspectorPanel === 'scene-look'}
                onClick={() => setActiveInspectorPanel(activeInspectorPanel === 'scene-look' ? null : 'scene-look')}
              >
                <span className="section-title">画面表现</span>
                <span className="toggle-meta">{sceneLook.summary}</span>
              </button>
              <div className={`inspector-body${activeInspectorPanel === 'scene-look' ? ' is-open' : ''}`} data-body="scene-look">
                <div className="scene-look-controls">
                  <label className="scene-look-control">
                    <span>亮度</span>
                    <input
                      className="quality-slider"
                      type="range"
                      min="80"
                      max="140"
                      step="1"
                      value={sceneLook.brightnessPercent}
                      onChange={(event) => requestSceneLookChange({
                        brightnessPercent: Number(event.currentTarget.value),
                        contrastPercent: sceneLook.contrastPercent,
                        saturationPercent: sceneLook.saturationPercent
                      })}
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
                      value={sceneLook.contrastPercent}
                      onChange={(event) => requestSceneLookChange({
                        brightnessPercent: sceneLook.brightnessPercent,
                        contrastPercent: Number(event.currentTarget.value),
                        saturationPercent: sceneLook.saturationPercent
                      })}
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
                      value={sceneLook.saturationPercent}
                      onChange={(event) => requestSceneLookChange({
                        brightnessPercent: sceneLook.brightnessPercent,
                        contrastPercent: sceneLook.contrastPercent,
                        saturationPercent: Number(event.currentTarget.value)
                      })}
                    />
                    <strong>{sceneLook.saturationValue}</strong>
                  </label>
                </div>
              </div>
            </section>

            <section className="inspector-section" data-panel="presets">
              <button
                className={`inspector-toggle${activeInspectorPanel === 'presets' ? ' is-active' : ''}`}
                type="button"
                aria-expanded={activeInspectorPanel === 'presets'}
                onClick={() => setActiveInspectorPanel(activeInspectorPanel === 'presets' ? null : 'presets')}
              >
                <span className="section-title">导览镜头</span>
                <span className="toggle-meta">{presetPanel.summary}</span>
              </button>
              <div className={`inspector-body${activeInspectorPanel === 'presets' ? ' is-open' : ''}`} data-body="presets">
                <RouteControlsPanel initialState={initialRouteControls} />
                <RouteDiagnosticsPanel />
                <PresetPanel
                  initialState={initialPresetPanel}
                />
              </div>
            </section>

            <CameraPanel />
          </div>
        </aside>
      </div>

      {showPerfHud ? (
        <aside className="perf-hud" aria-live="polite">
          <span className="perf-chip">FPS <strong>{perfHud.fps}</strong></span>
          <span className="perf-chip">帧时 <strong>{perfHud.ms}</strong></span>
          <span className="perf-chip">渲染 <strong>{perfHud.render}</strong></span>
          <span className="perf-chip">比例 <strong>{perfHud.scale}</strong></span>
        </aside>
      ) : null}
    </main>
  );
}

export {
  App
};
