import { CameraPanel } from './components/CameraPanel';
import { PresetPanel } from './components/PresetPanel';
import { RouteDiagnosticsPanel } from './components/RouteDiagnosticsPanel';
import { VariantPanel } from './components/VariantPanel';
import type { ViewerContent } from './types';

interface AppProps {
  data: ViewerContent;
  showPerfHud: boolean;
  maxRenderScalePercent: number;
  activeRenderScalePercent: number;
  renderScaleMinPercent: number;
}

export function App({
  data,
  showPerfHud,
  maxRenderScalePercent,
  activeRenderScalePercent,
  renderScaleMinPercent
}: AppProps) {
  const defaultVariant = data.variants.find((variant) => variant.id === data.scene.defaultVariantId) ?? data.variants[0];
  const firstPreset = data.presets[0];

  return (
    <main className="shell">
      <div className="scene" id="scene" />
      <div className="hud">
        <section className="rail">
          <div className="hero">
            <h1>{data.scene.title}</h1>
            <p className="hero-subtitle">{data.scene.subtitle}</p>
            <div className="hero-actions">
              <button className="button primary" id="focus-scene">进入</button>
              <button className="button secondary" id="focus-overview">全览</button>
            </div>
          </div>

          <div className="panel panel-reveal meta-panel">
            <div className="status-strip" aria-live="polite">
              <span className="status-dot" />
              <div className="status-copy">
                <strong id="status-title">准备加载场景</strong>
                <span id="status-detail">连接运行时</span>
              </div>
            </div>
            <div className="stats compact-stats">
              <div className="stat-card">
                <span>当前版本</span>
                <strong id="variant-title">{defaultVariant.name}</strong>
              </div>
              <div className="stat-card">
                <span>文件体积</span>
                <strong id="variant-size">{defaultVariant.size}</strong>
              </div>
              <div className="stat-card">
                <span>高斯数量</span>
                <strong id="variant-splats">{defaultVariant.splats}</strong>
              </div>
              <div className="stat-card">
                <span>保留比例</span>
                <strong id="variant-retention">{defaultVariant.retention}</strong>
              </div>
            </div>
            <p className="memory-body" id="variant-note">{defaultVariant.note}</p>
            <div className="metrics-grid" aria-live="polite">
              <div className="metric-card">
                <span>加载</span>
                <strong id="metric-load">—</strong>
              </div>
              <div className="metric-card">
                <span>首帧</span>
                <strong id="metric-first-frame">—</strong>
              </div>
              <div className="metric-card">
                <span>漫游</span>
                <strong id="metric-motion">待采样</strong>
              </div>
            </div>
          </div>
        </section>

        <div />

        <aside className="detail">
          <div className="panel panel-reveal inspector">
            <VariantPanel
              initialState={{
                summary: defaultVariant.name,
                items: data.variants.map((variant) => ({
                  id: variant.id,
                  name: variant.name,
                  meta: `${variant.size} · ${variant.retention}`,
                  isActive: variant.id === defaultVariant.id,
                  disabled: false
                }))
              }}
            />

            <section className="inspector-section" data-panel="quality">
              <button className="inspector-toggle" type="button" data-toggle="quality" aria-expanded="false">
                <span className="section-title">渲染清晰度</span>
                <span className="toggle-meta" id="quality-summary" />
              </button>
              <div className="inspector-body" data-body="quality">
                <div className="quality-control">
                  <input
                    className="quality-slider"
                    id="render-scale-slider"
                    type="range"
                    min={renderScaleMinPercent}
                    max={maxRenderScalePercent}
                    step="5"
                    defaultValue={activeRenderScalePercent}
                  />
                  <div className="quality-meta">
                    <strong id="render-scale-value" />
                    <span id="render-scale-note" />
                  </div>
                </div>
              </div>
            </section>

            <section className="inspector-section" data-panel="presets">
              <button className="inspector-toggle" type="button" data-toggle="presets" aria-expanded="false">
                <span className="section-title">导览镜头</span>
                <span className="toggle-meta" id="presets-summary">{firstPreset.name}</span>
              </button>
              <div className="inspector-body" data-body="presets">
                <div className="route-group">
                  <div className="route-head">
                    <span>对比轨迹</span>
                    <strong id="route-summary">未播放</strong>
                  </div>
                  <div className="route-list" id="route-list" />
                  <div className="route-batch">
                    <div className="route-batch-actions">
                      <button className="button tertiary route-batch-button" id="run-route-current-variant" type="button">
                        跑当前轨迹 × 当前版本 ×3
                      </button>
                      <button className="button tertiary route-batch-button" id="run-route-suite" type="button">
                        跑当前轨迹 × 全版本
                      </button>
                    </div>
                    <span className="route-batch-note" id="route-batch-note">默认使用当前选中的轨迹。</span>
                  </div>
                  <RouteDiagnosticsPanel />
                </div>
                <PresetPanel
                  initialState={{
                    summary: firstPreset.name,
                    items: data.presets.map((preset) => ({
                      id: preset.id,
                      name: preset.name,
                      summary: preset.summary,
                      isActive: preset.id === firstPreset.id
                    }))
                  }}
                />
              </div>
            </section>

            <CameraPanel />
          </div>
        </aside>
      </div>

      {showPerfHud ? (
        <aside className="perf-hud" aria-live="polite">
          <span className="perf-chip">FPS <strong id="perf-fps">—</strong></span>
          <span className="perf-chip">帧时 <strong id="perf-ms">—</strong></span>
          <span className="perf-chip">渲染 <strong id="perf-render">启动中</strong></span>
          <span className="perf-chip">比例 <strong id="perf-scale">{activeRenderScalePercent}%</strong></span>
        </aside>
      ) : null}
    </main>
  );
}
