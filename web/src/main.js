import './style.css';

const pc = await import(/* @vite-ignore */ 'https://esm.sh/playcanvas@2.17.2?bundle');

const appElement = document.querySelector('#app');

if (!appElement) {
  throw new Error('Missing #app root');
}

const data = await fetch('/content/mvp.json').then(async (response) => {
  if (!response.ok) {
    throw new Error(`Failed to load content: ${response.status}`);
  }

  return response.json();
});

const showPerfHud = import.meta.env.DEV;
const renderScaleStorageKey = 'ruoshui-render-scale-percent';
const routeRunHistoryStorageKey = 'ruoshui-route-run-history';
const routeAnalysisCopyFeedbackMs = 1600;
const renderScaleMinPercent = 70;
const cameraMetaIntervalSeconds = 0.12;
const perfHudIntervalSeconds = 0.5;
const renderWakeSeconds = 0.25;
const maxRouteRunHistory = 8;
const stallFrameThresholdMs = 22;
const severeStallFrameThresholdMs = 50;
const lowAnglePrewarmPitchThresholdDeg = 52;
const lowAnglePrewarmDistanceThreshold = 3.35;
const lowAnglePrewarmLeadSeconds = 0.9;
const lowAnglePrewarmHoldSeconds = 1.4;
const lowAnglePrewarmMaxSeconds = 2.2;
const currentVariantRepeatCount = 3;
const minOrbitPitchDeg = 6;
const maxOrbitPitchDeg = 89;
const frameSampleIndices = {
  elapsedMs: 0,
  dtMs: 1,
  stepIndex: 2,
  posX: 3,
  posY: 4,
  posZ: 5,
  targetX: 6,
  targetY: 7,
  targetZ: 8,
  distance: 9,
  pitch: 10,
  yaw: 11
};
const variantsById = new Map(data.variants.map((variant) => [variant.id, variant]));
const benchmarkRoutes = data.benchmarkRoutes ?? [];
const benchmarkRoutesById = new Map(benchmarkRoutes.map((route) => [route.id, route]));
const firstPreset = data.presets[0];
const defaultVariant = variantsById.get(data.scene.defaultVariantId) ?? data.variants[0];
const maxRenderScalePercent = Math.round(getMaxSupportedPixelRatio(window) * 100);
let activeRenderScalePercent = getInitialRenderScalePercent();
const longTaskBuffer = [];

initLongTaskObserver();

appElement.innerHTML = `
  <main class="shell">
    <div class="scene" id="scene"></div>
    <div class="hud">
      <section class="rail">
        <div class="hero">
          <h1>${data.scene.title}</h1>
          <p class="hero-subtitle">${data.scene.subtitle}</p>
          <div class="hero-actions">
            <button class="button primary" id="focus-scene">进入</button>
            <button class="button secondary" id="focus-overview">全览</button>
          </div>
        </div>

        <div class="panel panel-reveal meta-panel">
          <div class="status-strip" aria-live="polite">
            <span class="status-dot"></span>
            <div class="status-copy">
              <strong id="status-title">准备加载场景</strong>
              <span id="status-detail">连接运行时</span>
            </div>
          </div>
          <div class="stats compact-stats">
            <div class="stat-card">
              <span>当前版本</span>
              <strong id="variant-title">${defaultVariant.name}</strong>
            </div>
            <div class="stat-card">
              <span>文件体积</span>
              <strong id="variant-size">${defaultVariant.size}</strong>
            </div>
            <div class="stat-card">
              <span>高斯数量</span>
              <strong id="variant-splats">${defaultVariant.splats}</strong>
            </div>
            <div class="stat-card">
              <span>保留比例</span>
              <strong id="variant-retention">${defaultVariant.retention}</strong>
            </div>
          </div>
          <p class="memory-body" id="variant-note">${defaultVariant.note}</p>
          <div class="metrics-grid" aria-live="polite">
            <div class="metric-card">
              <span>加载</span>
              <strong id="metric-load">—</strong>
            </div>
            <div class="metric-card">
              <span>首帧</span>
              <strong id="metric-first-frame">—</strong>
            </div>
            <div class="metric-card">
              <span>漫游</span>
              <strong id="metric-motion">待采样</strong>
            </div>
          </div>
        </div>
      </section>

      <div></div>

      <aside class="detail">
        <div class="panel panel-reveal inspector">
          <section class="inspector-section variant-section" data-panel="variants">
            <button class="inspector-toggle" type="button" data-toggle="variants" aria-expanded="false">
              <span class="section-title">模型版本</span>
              <span class="toggle-meta" id="variants-summary">${defaultVariant.name}</span>
            </button>
            <div class="inspector-body" data-body="variants">
              <div class="variant-list" id="variant-list"></div>
            </div>
          </section>

          <section class="inspector-section" data-panel="quality">
            <button class="inspector-toggle" type="button" data-toggle="quality" aria-expanded="false">
              <span class="section-title">渲染清晰度</span>
              <span class="toggle-meta" id="quality-summary"></span>
            </button>
            <div class="inspector-body" data-body="quality">
              <div class="quality-control">
                <input
                  class="quality-slider"
                  id="render-scale-slider"
                  type="range"
                  min="${renderScaleMinPercent}"
                  max="${maxRenderScalePercent}"
                  step="5"
                  value="${activeRenderScalePercent}"
                />
                <div class="quality-meta">
                  <strong id="render-scale-value"></strong>
                  <span id="render-scale-note"></span>
                </div>
              </div>
            </div>
          </section>

          <section class="inspector-section" data-panel="presets">
            <button class="inspector-toggle" type="button" data-toggle="presets" aria-expanded="false">
              <span class="section-title">导览镜头</span>
              <span class="toggle-meta" id="presets-summary">${firstPreset.name}</span>
            </button>
            <div class="inspector-body" data-body="presets">
              <div class="route-group">
                <div class="route-head">
                  <span>对比轨迹</span>
                  <strong id="route-summary">未播放</strong>
                </div>
                <div class="route-list" id="route-list"></div>
                <div class="route-batch">
                  <div class="route-batch-actions">
                    <button class="button tertiary route-batch-button" id="run-route-current-variant" type="button">跑当前轨迹 × 当前版本 ×3</button>
                    <button class="button tertiary route-batch-button" id="run-route-suite" type="button">跑当前轨迹 × 全版本</button>
                  </div>
                  <span class="route-batch-note" id="route-batch-note">默认使用当前选中的轨迹。</span>
                </div>
                <div class="route-log">
                  <div class="route-log-head">
                    <span>自动记录</span>
                    <strong id="route-log-summary">暂无</strong>
                  </div>
                  <div class="route-log-list" id="route-log-list"></div>
                </div>
                <div class="route-analysis">
                  <div class="route-analysis-head">
                    <span>标准测试分析</span>
                    <strong id="route-analysis-summary">等待批量测试</strong>
                  </div>
                <div class="route-analysis-actions">
                  <button class="button tertiary route-analysis-button" id="copy-route-analysis-summary" type="button">复制摘要</button>
                  <button class="button tertiary route-analysis-button" id="copy-route-analysis-json" type="button">复制 JSON</button>
                  <button class="button tertiary route-analysis-button" id="download-route-analysis-json" type="button">下载 JSON</button>
                </div>
                  <div class="route-analysis-copy-note" id="route-analysis-copy-note">跑完一轮标准测试后可复制。</div>
                  <div class="route-analysis-ranking" id="route-analysis-ranking"></div>
                  <div class="route-analysis-hotspots" id="route-analysis-hotspots"></div>
                </div>
              </div>
              <div class="preset-list" id="preset-list"></div>
            </div>
          </section>

          <section class="inspector-section" data-panel="camera">
            <button class="inspector-toggle" type="button" data-toggle="camera" aria-expanded="false">
              <span class="section-title">相机信息</span>
              <span class="toggle-meta" id="camera-summary">等待视角</span>
            </button>
            <div class="inspector-body" data-body="camera">
              <div class="camera-grid">
                <div class="camera-card">
                  <span>位置</span>
                  <strong id="camera-position">—</strong>
                </div>
                <div class="camera-card">
                  <span>目标</span>
                  <strong id="camera-target">—</strong>
                </div>
                <div class="camera-card">
                  <span>距离</span>
                  <strong id="camera-distance">—</strong>
                </div>
                <div class="camera-card">
                  <span>俯仰 / 水平</span>
                  <strong id="camera-angle">—</strong>
                </div>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
    ${showPerfHud ? `
      <aside class="perf-hud" aria-live="polite">
        <span class="perf-chip">FPS <strong id="perf-fps">—</strong></span>
        <span class="perf-chip">帧时 <strong id="perf-ms">—</strong></span>
        <span class="perf-chip">渲染 <strong id="perf-render">启动中</strong></span>
        <span class="perf-chip">比例 <strong id="perf-scale">${activeRenderScalePercent}%</strong></span>
      </aside>
    ` : ''}
  </main>
`;

const sceneContainer = document.querySelector('#scene');
const variantList = document.querySelector('#variant-list');
const routeList = document.querySelector('#route-list');
const routeLogList = document.querySelector('#route-log-list');
const routeAnalysisRanking = document.querySelector('#route-analysis-ranking');
const routeAnalysisHotspots = document.querySelector('#route-analysis-hotspots');
const presetList = document.querySelector('#preset-list');
const runRouteCurrentVariantButton = document.querySelector('#run-route-current-variant');
const runRouteSuiteButton = document.querySelector('#run-route-suite');
const routeBatchNote = document.querySelector('#route-batch-note');
const copyRouteAnalysisSummaryButton = document.querySelector('#copy-route-analysis-summary');
const copyRouteAnalysisJsonButton = document.querySelector('#copy-route-analysis-json');
const downloadRouteAnalysisJsonButton = document.querySelector('#download-route-analysis-json');
const renderScaleSlider = document.querySelector('#render-scale-slider');
const statusTitle = document.querySelector('#status-title');
const statusDetail = document.querySelector('#status-detail');
const variantSize = document.querySelector('#variant-size');
const variantSplats = document.querySelector('#variant-splats');
const variantRetention = document.querySelector('#variant-retention');
const variantTitle = document.querySelector('#variant-title');
const variantNote = document.querySelector('#variant-note');
const metricLoad = document.querySelector('#metric-load');
const metricFirstFrame = document.querySelector('#metric-first-frame');
const metricMotion = document.querySelector('#metric-motion');
const renderScaleValue = document.querySelector('#render-scale-value');
const renderScaleNote = document.querySelector('#render-scale-note');
const focusSceneButton = document.querySelector('#focus-scene');
const focusOverviewButton = document.querySelector('#focus-overview');
const variantsSummary = document.querySelector('#variants-summary');
const qualitySummary = document.querySelector('#quality-summary');
const presetsSummary = document.querySelector('#presets-summary');
const routeSummary = document.querySelector('#route-summary');
const routeLogSummary = document.querySelector('#route-log-summary');
const routeAnalysisSummary = document.querySelector('#route-analysis-summary');
const routeAnalysisCopyNote = document.querySelector('#route-analysis-copy-note');
const cameraSummary = document.querySelector('#camera-summary');
const cameraPosition = document.querySelector('#camera-position');
const cameraTarget = document.querySelector('#camera-target');
const cameraDistance = document.querySelector('#camera-distance');
const cameraAngle = document.querySelector('#camera-angle');
const perfFps = showPerfHud ? document.querySelector('#perf-fps') : null;
const perfMs = showPerfHud ? document.querySelector('#perf-ms') : null;
const perfRender = showPerfHud ? document.querySelector('#perf-render') : null;
const perfScale = showPerfHud ? document.querySelector('#perf-scale') : null;
const inspectorToggles = [...document.querySelectorAll('[data-toggle]')];
const inspectorBodies = new Map(
  [...document.querySelectorAll('[data-body]')].map((element) => [element.dataset.body, element])
);

if (
  !sceneContainer ||
  !variantList ||
  !routeList ||
  !routeLogList ||
  !routeAnalysisRanking ||
  !routeAnalysisHotspots ||
  !presetList ||
  !runRouteCurrentVariantButton ||
  !runRouteSuiteButton ||
  !routeBatchNote ||
  !copyRouteAnalysisSummaryButton ||
  !copyRouteAnalysisJsonButton ||
  !downloadRouteAnalysisJsonButton ||
  !renderScaleSlider ||
  !statusTitle ||
  !statusDetail ||
  !variantSize ||
  !variantSplats ||
  !variantRetention ||
  !variantTitle ||
  !variantNote ||
  !metricLoad ||
  !metricFirstFrame ||
  !metricMotion ||
  !renderScaleValue ||
  !renderScaleNote ||
  !focusSceneButton ||
  !focusOverviewButton ||
  !variantsSummary ||
  !qualitySummary ||
  !presetsSummary ||
  !routeSummary ||
  !routeLogSummary ||
  !routeAnalysisSummary ||
  !routeAnalysisCopyNote ||
  !cameraSummary ||
  !cameraPosition ||
  !cameraTarget ||
  !cameraDistance ||
  !cameraAngle ||
  (showPerfHud && (!perfFps || !perfMs || !perfRender || !perfScale)) ||
  inspectorToggles.length === 0 ||
  inspectorBodies.size === 0
) {
  throw new Error('Failed to initialize UI shell');
}

let runtime = null;
let activePresetId = firstPreset.id;
let activeVariantId = defaultVariant.id;
let activeRouteId = null;
let selectedRouteId = benchmarkRoutes[0]?.id ?? null;
let currentLoadToken = 0;
let openInspectorPanel = null;
let isBatchBenchmarkRunning = false;
let activeSuiteRunId = null;
let routeAnalysisCopyTimeoutId = null;
let activeBenchmarkRunPromise = null;

const variantButtons = new Map();
const routeButtons = new Map();
const presetButtons = new Map();
const variantBenchmarks = new Map();
const routeRunHistory = getInitialRouteRunHistory();

for (const variant of data.variants) {
  const button = document.createElement('button');
  button.className = 'variant';
  button.type = 'button';
  button.innerHTML = `
    <span class="variant-line">
      <strong>${variant.name}</strong>
      <small>${variant.size} · ${variant.retention}</small>
    </span>
  `;
  button.addEventListener('click', () => {
    void activateVariant(variant.id);
  });
  variantButtons.set(variant.id, button);
  variantList.append(button);
}

for (const preset of data.presets) {
  const button = document.createElement('button');
  button.className = 'preset';
  button.type = 'button';
  button.innerHTML = `<strong>${preset.name}</strong><span>${preset.summary}</span>`;
  button.addEventListener('click', () => {
    activatePreset(preset.id);
  });
  presetButtons.set(preset.id, button);
  presetList.append(button);
}

for (const route of benchmarkRoutes) {
  const button = document.createElement('button');
  button.className = 'route';
  button.type = 'button';
  button.innerHTML = `<strong>${route.name}</strong><span>${route.summary}</span>`;
  button.addEventListener('click', () => {
    activateBenchmarkRoute(route.id);
  });
  routeButtons.set(route.id, button);
  routeList.append(button);
}

focusSceneButton.addEventListener('click', () => activatePreset(firstPreset.id));
focusOverviewButton.addEventListener('click', () => activatePreset('hover'));
runRouteCurrentVariantButton.addEventListener('click', () => {
  void runCurrentVariantRouteBenchmark();
});
runRouteSuiteButton.addEventListener('click', () => {
  void runRouteBenchmarkSuite();
});
copyRouteAnalysisSummaryButton.addEventListener('click', () => {
  void copyLatestRouteAnalysis('summary');
});
copyRouteAnalysisJsonButton.addEventListener('click', () => {
  void copyLatestRouteAnalysis('json');
});
downloadRouteAnalysisJsonButton.addEventListener('click', () => {
  downloadLatestRouteAnalysisJson();
});
renderScaleSlider.addEventListener('input', (event) => {
  const nextPercent = Number(event.currentTarget.value);
  activateRenderScale(nextPercent);
});
for (const toggle of inspectorToggles) {
  toggle.addEventListener('click', () => {
    const { toggle: panelId } = toggle.dataset;
    if (!panelId) {
      return;
    }

    setOpenInspectorPanel(openInspectorPanel === panelId ? null : panelId);
  });
}

updatePresetButtons();
updateVariantButtons();
updateRouteButtons();
renderRouteBatchState();
renderVariantMeta(defaultVariant);
renderRenderScaleMeta(activeRenderScalePercent);
renderCameraMeta(null);
renderPerfHud(null);
renderRouteRunHistory();
renderRouteAnalysis();
installRouteAnalysisBridge();
setOpenInspectorPanel(openInspectorPanel);

statusTitle.textContent = '加载中';
statusDetail.textContent = '准备场景资源';

await activateVariant(defaultVariant.id, true);

function renderVariantMeta(variant) {
  variantSize.textContent = variant.size;
  variantSplats.textContent = variant.splats;
  variantRetention.textContent = variant.retention;
  variantTitle.textContent = variant.name;
  variantNote.textContent = variant.note;
  variantsSummary.textContent = variant.name;
  renderVariantBenchmark(variant.id);
}

function activateRenderScale(nextPercent) {
  const normalizedPercent = normalizeRenderScalePercent(nextPercent);
  activeRenderScalePercent = normalizedPercent;
  renderScaleSlider.value = String(normalizedPercent);
  persistRenderScalePercent(normalizedPercent);
  renderRenderScaleMeta(normalizedPercent);
  applyRenderScaleToRuntime(runtime, normalizedPercent);
  renderPerfHud(runtime);
}

function renderRenderScaleMeta(percent) {
  const pixelRatio = (percent / 100).toFixed(2);
  renderScaleValue.textContent = `${percent}% · x${pixelRatio}`;
  qualitySummary.textContent = `${percent}%`;
  renderScaleNote.textContent = percent >= 100
    ? '原生像素比'
    : '降低像素比，换取更稳帧率';
}

async function activateVariant(variantId, initial = false, forceReload = false) {
  const variant = variantsById.get(variantId);

  if (!variant) {
    return;
  }

  if (!initial && !forceReload && variantId === activeVariantId) {
    return;
  }

  if (activeRouteId) {
    stopActiveBenchmarkRoute('未播放', 'switch');
  }

  const loadToken = ++currentLoadToken;
  const switchStartedAt = performance.now();
  const preservedView = initial ? null : captureCurrentView(runtime);
  const benchmark = beginVariantBenchmark(variant.id);
  activeVariantId = variant.id;
  updateVariantButtons();
  renderVariantMeta(variant);
  setVariantButtonsDisabled(true);
  statusTitle.textContent = '切换中';
  statusDetail.textContent = `${variant.name}`;

  try {
    const nextRuntime = await mountRuntime(variant, { switchStartedAt, benchmark });
    if (loadToken !== currentLoadToken) {
      nextRuntime?.destroy?.();
      return;
    }

    runtime = nextRuntime;
    const restored = restoreCurrentView(runtime, preservedView);
    if (!restored) {
      activatePreset(activePresetId || 'hover', true);
    }
    statusTitle.textContent = '场景已就绪';
    statusDetail.textContent = `${variant.size} · ${variant.retention} 保留`;
  } catch (error) {
    statusTitle.textContent = '加载失败';
    statusDetail.textContent = error instanceof Error ? error.message : '未知错误';
    throw error;
  } finally {
    if (loadToken === currentLoadToken) {
      setVariantButtonsDisabled(false);
    }
  }
}

async function mountRuntime(variant, timings) {
  if (runtime) {
    await loadVariantIntoRuntime(runtime, variant, timings);
    return runtime;
  }

  sceneContainer.replaceChildren();
  const canvas = document.createElement('canvas');
  sceneContainer.append(canvas);
  return createRuntime(canvas, variant, timings);
}

function activatePreset(presetId, immediate = false) {
  const preset = data.presets.find((entry) => entry.id === presetId);

  if (!preset) {
    return;
  }

  if (activeRouteId) {
    stopActiveBenchmarkRoute('镜头接管', 'manual');
  }

  activePresetId = preset.id;
  presetsSummary.textContent = preset.name;
  updatePresetButtons();

  if (runtime) {
    moveCamera(runtime, preset, immediate);
  }
}

function activateBenchmarkRoute(routeId) {
  const route = benchmarkRoutesById.get(routeId);

  if (!route) {
    return;
  }

  selectedRouteId = route.id;
  if (activeRouteId === routeId) {
    stopActiveBenchmarkRoute();
    return;
  }

  activeRouteId = route.id;
  routeSummary.textContent = `${route.name} · 运行中`;
  updateRouteButtons();

  if (runtime) {
    startBenchmarkRoute(runtime, route);
  }
}

async function runRouteBenchmarkSuite() {
  const routeId = selectedRouteId ?? benchmarkRoutes[0]?.id;
  const route = routeId ? benchmarkRoutesById.get(routeId) : null;

  if (!route || isBatchBenchmarkRunning) {
    return;
  }

  isBatchBenchmarkRunning = true;
  renderRouteBatchState();
  setVariantButtonsDisabled(true);
  statusTitle.textContent = '标准测试中';

  try {
    activeSuiteRunId = `suite-${Date.now()}`;
    for (let index = 0; index < data.variants.length; index += 1) {
      const variant = data.variants[index];
      statusDetail.textContent = `${route.name} · ${index + 1}/${data.variants.length} · ${variant.name}`;
      await activateVariant(variant.id, false, true);
      await playBenchmarkRouteOnce(route.id);
    }

    statusTitle.textContent = '标准测试完成';
    statusDetail.textContent = `${route.name} · 已记录 ${data.variants.length} 个版本`;
  } catch (error) {
    statusTitle.textContent = '标准测试中断';
    statusDetail.textContent = error instanceof Error ? error.message : '未知错误';
    throw error;
  } finally {
    activeSuiteRunId = null;
    isBatchBenchmarkRunning = false;
    renderRouteBatchState();
    setVariantButtonsDisabled(false);
    updateRouteButtons();
  }
}

async function runCurrentVariantRouteBenchmark() {
  return runVariantRouteBenchmark({
    routeId: selectedRouteId ?? benchmarkRoutes[0]?.id,
    variantId: activeVariantId,
    repeatCount: currentVariantRepeatCount,
    suitePrefix: 'single'
  });
}

async function runVariantRouteBenchmark(options = {}) {
  const routeId = options.routeId ?? selectedRouteId ?? benchmarkRoutes[0]?.id;
  const route = routeId ? benchmarkRoutesById.get(routeId) : null;
  const variantId = options.variantId ?? activeVariantId;
  const variant = variantsById.get(variantId);
  const repeatCount = Number.isFinite(options.repeatCount)
    ? Math.max(1, Math.floor(options.repeatCount))
    : currentVariantRepeatCount;
  const suitePrefix = options.suitePrefix ?? 'single';

  if (!route || !variant || isBatchBenchmarkRunning) {
    return null;
  }

  activeBenchmarkRunPromise = (async () => {
    isBatchBenchmarkRunning = true;
    renderRouteBatchState();
    setVariantButtonsDisabled(true);
    statusTitle.textContent = '单版本测试中';

    try {
      activeSuiteRunId = `${suitePrefix}-${Date.now()}`;
      for (let index = 0; index < repeatCount; index += 1) {
        statusDetail.textContent = `${route.name} · ${variant.name} · 第 ${index + 1}/${repeatCount} 次`;
        await activateVariant(variant.id, false, true);
        await playBenchmarkRouteOnce(route.id);
      }
      statusTitle.textContent = '单版本测试完成';
      statusDetail.textContent = `${route.name} · ${variant.name} 已记录 ${repeatCount} 次`;
      return getLatestRouteAnalysisExport();
    } catch (error) {
      statusTitle.textContent = '单版本测试中断';
      statusDetail.textContent = error instanceof Error ? error.message : '未知错误';
      throw error;
    } finally {
      activeSuiteRunId = null;
      isBatchBenchmarkRunning = false;
      activeBenchmarkRunPromise = null;
      renderRouteBatchState();
      setVariantButtonsDisabled(false);
      updateRouteButtons();
    }
  })();

  return activeBenchmarkRunPromise;
}

function playBenchmarkRouteOnce(routeId) {
  const route = benchmarkRoutesById.get(routeId);

  if (!runtime || !route) {
    return Promise.reject(new Error('缺少可运行的轨迹或运行时'));
  }

  return new Promise((resolve, reject) => {
    selectedRouteId = route.id;
    activeRouteId = route.id;
    routeSummary.textContent = `${route.name} · 运行中`;
    updateRouteButtons();
    renderRouteBatchState();
    startBenchmarkRoute(runtime, route, {
      onFinish: (record) => {
        if (!record || record.status !== 'completed') {
          reject(new Error(`${route.name} 未完整跑完`));
          return;
        }

        resolve(record);
      }
    });
  });
}

function setOpenInspectorPanel(panelId) {
  openInspectorPanel = panelId;

  for (const toggle of inspectorToggles) {
    const isOpen = toggle.dataset.toggle === panelId;
    toggle.classList.toggle('is-active', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  }

  for (const [bodyId, body] of inspectorBodies) {
    body.classList.toggle('is-open', bodyId === panelId);
  }
}

function updatePresetButtons() {
  for (const [presetId, button] of presetButtons) {
    button.classList.toggle('is-active', presetId === activePresetId);
  }
}

function updateVariantButtons() {
  for (const [variantId, button] of variantButtons) {
    button.classList.toggle('is-active', variantId === activeVariantId);
  }
}

function updateRouteButtons() {
  for (const [routeId, button] of routeButtons) {
    button.classList.toggle('is-active', routeId === selectedRouteId);
    button.classList.toggle('is-running', routeId === activeRouteId);
    button.disabled = isBatchBenchmarkRunning;
  }
}

function setVariantButtonsDisabled(disabled) {
  for (const button of variantButtons.values()) {
    button.disabled = disabled;
  }
}

function renderRouteBatchState() {
  if (!runRouteCurrentVariantButton || !runRouteSuiteButton || !routeBatchNote) {
    return;
  }

  const selectedRoute = selectedRouteId ? benchmarkRoutesById.get(selectedRouteId) : null;
  runRouteCurrentVariantButton.disabled = isBatchBenchmarkRunning || benchmarkRoutes.length === 0;
  runRouteSuiteButton.disabled = isBatchBenchmarkRunning || benchmarkRoutes.length === 0;
  runRouteCurrentVariantButton.textContent = isBatchBenchmarkRunning ? '测试运行中…' : `跑当前轨迹 × 当前版本 ×${currentVariantRepeatCount}`;
  runRouteSuiteButton.textContent = isBatchBenchmarkRunning ? '标准测试运行中…' : '跑当前轨迹 × 全版本';
  routeBatchNote.textContent = selectedRoute
    ? `${selectedRoute.name} · 当前版本或 ${data.variants.length} 个版本`
    : '先选择一条轨迹，再批量跑所有版本。';
}

async function createRuntime(canvasElement, variant, timings = {}) {
  const app = new pc.Application(canvasElement, {
    mouse: new pc.Mouse(canvasElement),
    touch: new pc.TouchDevice(canvasElement),
    graphicsDeviceOptions: {
      antialias: false,
      powerPreference: 'high-performance'
    }
  });

  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  const performanceMode = createPerformanceMode(window, activeRenderScalePercent);
  const loopController = createLoopController(app);
  app.graphicsDevice.maxPixelRatio = performanceMode.currentPixelRatio;
  app.scene.gammaCorrection = pc.GAMMA_SRGB;
  app.scene.toneMapping = pc.TONEMAP_ACES;
  app.scene.skyboxIntensity = 0.65;
  app.start();
  app.autoRender = true;
  app.renderNextFrame = true;

  const preventContextMenu = (event) => event.preventDefault();
  const handleResize = () => {
    loopController.wake();
    app.resizeCanvas();
    app.renderNextFrame = true;
  };
  canvasElement.addEventListener('contextmenu', preventContextMenu);
  window.addEventListener('resize', handleResize);

  const camera = new pc.Entity('MemorialCamera');
  camera.addComponent('camera', {
    clearColor: new pc.Color(0.02, 0.04, 0.06),
    fov: 52,
    nearClip: 0.01,
    farClip: 64
  });
  app.root.addChild(camera);

  const initialTarget = vec3(firstPreset.target);
  const initialPosition = vec3(firstPreset.position);
  const orbit = createOrbitController(camera, canvasElement, initialPosition, initialTarget, performanceMode);

  const runtimeState = {
    variantId: variant.id,
    app,
    canvasElement,
    orbit,
    benchmark: timings.benchmark ?? beginVariantBenchmark(variant.id),
    performanceMode,
    loopController,
    routePlayback: null,
    routeRecord: null,
    splatAsset: null,
    splatEntity: null,
    variantMeta: variant,
    unifiedLodState: null,
    lastCameraSnapshot: '',
    cameraMetaElapsed: 0,
    perfHudElapsed: 0,
    perfHudFrames: 0,
    renderWakeRemaining: renderWakeSeconds,
    requestRender: () => {
      loopController.wake();
      runtimeState.renderWakeRemaining = renderWakeSeconds;
      app.autoRender = true;
      app.renderNextFrame = true;
    },
    destroy: () => {
      loopController.wake();
      detachVariantFromRuntime(runtimeState);
      window.removeEventListener('resize', handleResize);
      canvasElement.removeEventListener('contextmenu', preventContextMenu);
      orbit.destroy();
      app.destroy();
    }
  };

  orbit.onManualInput = () => {
    if (activeRouteId) {
      stopActiveBenchmarkRoute('手动接管', 'manual');
    }
    runtimeState.requestRender();
  };

  const suspendRuntime = () => {
    runtimeState.renderWakeRemaining = 0;
    runtimeState.orbit.cancelInteraction?.();
    app.autoRender = false;
    app.renderNextFrame = false;
    loopController.sleep();
  };

  const resumeRuntime = () => {
    runtimeState.requestRender();
    renderCameraMeta(runtimeState);
    renderPerfHud(runtimeState);
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      suspendRuntime();
      return;
    }

    resumeRuntime();
  };

  const handleWindowBlur = () => {
    runtimeState.orbit.cancelInteraction?.();
  };

  const handleWindowFocus = () => {
    if (!document.hidden) {
      resumeRuntime();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleWindowBlur);
  window.addEventListener('focus', handleWindowFocus);

  const handleUpdate = (dt) => {
    const routeChanged = updateBenchmarkRoute(runtimeState, dt);
    const orbitChanged = updateOrbitController(runtimeState.orbit, dt);
    const performanceChanged = updatePerformanceMode(runtimeState.performanceMode, app, dt);
    const isMoving = routeChanged || orbitChanged || runtimeState.performanceMode.isInteracting;
    const unifiedLodChanged = updateUnifiedLodWarmup(runtimeState, dt, isMoving);
    const hasActiveRoutePlayback = Boolean(runtimeState.routePlayback);
    if (runtimeState.routeRecord && hasActiveRoutePlayback) {
      recordRouteFrame(runtimeState, dt);
    }
    const keepRendering = hasActiveRoutePlayback || isMoving || performanceChanged || isUnifiedLodWarmupActive(runtimeState);
    if (isMoving) {
      sampleMotionFrame(runtimeState.benchmark, dt);
    } else if (endMotionSession(runtimeState.benchmark)) {
      publishVariantBenchmark(runtimeState.variantId);
    }
    if (keepRendering) {
      runtimeState.requestRender();
    } else if (runtimeState.renderWakeRemaining > 0) {
      runtimeState.renderWakeRemaining = Math.max(0, runtimeState.renderWakeRemaining - dt);
      if (runtimeState.renderWakeRemaining === 0) {
        app.autoRender = false;
        loopController.sleep();
      }
    }
    runtimeState.cameraMetaElapsed += dt;
    if (runtimeState.cameraMetaElapsed >= cameraMetaIntervalSeconds) {
      renderCameraMeta(runtimeState);
      runtimeState.cameraMetaElapsed = 0;
    }
    runtimeState.perfHudElapsed += dt;
    runtimeState.perfHudFrames += 1;
    if (runtimeState.perfHudElapsed >= perfHudIntervalSeconds) {
      renderPerfHud(runtimeState);
      runtimeState.perfHudElapsed = 0;
      runtimeState.perfHudFrames = 0;
    }

    if (unifiedLodChanged) {
      runtimeState.requestRender();
    }
  };
  app.on('update', handleUpdate);
  const destroyRuntime = runtimeState.destroy;
  runtimeState.destroy = () => {
    app.off('update', handleUpdate);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('focus', handleWindowFocus);
    destroyRuntime();
  };

  await loadVariantIntoRuntime(runtimeState, variant, timings);
  return runtimeState;
}

async function loadVariantIntoRuntime(runtimeState, variant, timings = {}) {
  if (!runtimeState?.app) {
    throw new Error('运行时尚未初始化');
  }

  runtimeState.loopController?.wake?.();
  detachVariantFromRuntime(runtimeState);

  const benchmark = timings.benchmark ?? beginVariantBenchmark(variant.id);
  runtimeState.variantId = variant.id;
  runtimeState.variantMeta = variant;
  runtimeState.benchmark = benchmark;
  runtimeState.routePlayback = null;
  runtimeState.routeRecord = null;
  runtimeState.unifiedLodState = null;

  const splatAsset = new pc.Asset(`ruoshui-${variant.id}`, 'gsplat', { url: variant.assetUrl });
  const assetLoadStartedAt = performance.now();

  await new Promise((resolve, reject) => {
    const loader = new pc.AssetListLoader([splatAsset], runtimeState.app.assets);
    const onError = (err, asset) => {
      runtimeState.app.assets.off('error', onError);
      reject(new Error(`加载 ${asset.name} 失败：${String(err)}`));
    };

    runtimeState.app.assets.on('error', onError);
    loader.load(() => {
      runtimeState.app.assets.off('error', onError);
      benchmark.loadMs = performance.now() - assetLoadStartedAt;
      publishVariantBenchmark(variant.id);
      resolve();
    });
  });

  const splat = new pc.Entity('RuoshuiCampus');
  const gsplatComponent = {
    asset: splatAsset
  };

  if (variant.unified) {
    gsplatComponent.unified = true;
  }

  if (variant.lodDistances) {
    gsplatComponent.lodDistances = variant.lodDistances;
  }

  splat.addComponent('gsplat', gsplatComponent);
  runtimeState.app.root.addChild(splat);
  runtimeState.splatAsset = splatAsset;
  runtimeState.splatEntity = splat;
  runtimeState.unifiedLodState = configureUnifiedGsplat(runtimeState.app, variant);
  trackFirstFrame(runtimeState.app, variant.id, timings.switchStartedAt);
  runtimeState.requestRender?.();
}

function detachVariantFromRuntime(runtimeState) {
  if (!runtimeState?.app) {
    return;
  }

  if (runtimeState.splatEntity) {
    runtimeState.splatEntity.destroy();
    runtimeState.splatEntity = null;
  }

  if (runtimeState.splatAsset) {
    runtimeState.splatAsset.unload?.();
    runtimeState.app.assets.remove(runtimeState.splatAsset);
    runtimeState.splatAsset = null;
  }
}

function moveCamera(runtimeState, preset, immediate = false) {
  setOrbitPreset(runtimeState.orbit, vec3(preset.position), vec3(preset.target), immediate);
  runtimeState.requestRender();
}

function startBenchmarkRoute(runtimeState, route, options = {}) {
  if (!runtimeState || !route?.steps?.length) {
    return;
  }

  beginMotionSession(runtimeState.benchmark);
  publishVariantBenchmark(runtimeState.variantId);
  runtimeState.routeRecord = createRouteRunRecord(route, runtimeState.variantId);
  runtimeState.routePlayback = {
    route,
    onFinish: options.onFinish ?? null,
    stepIndex: -1,
    stepRemaining: 0
  };
  advanceBenchmarkRoute(runtimeState);
}

function stopBenchmarkRoute(runtimeState, status = 'aborted') {
  if (!runtimeState) {
    return;
  }

  const playback = runtimeState.routePlayback;
  const finalizedRecord = finalizeRouteRunRecord(runtimeState, status);
  runtimeState.routePlayback = null;
  playback?.onFinish?.(finalizedRecord);
}

function stopActiveBenchmarkRoute(summaryText = '未播放', status = 'aborted') {
  if (runtime) {
    stopBenchmarkRoute(runtime, status);
  }

  activeRouteId = null;
  routeSummary.textContent = summaryText;
  updateRouteButtons();
}

function advanceBenchmarkRoute(runtimeState) {
  const playback = runtimeState?.routePlayback;

  if (!playback) {
    return false;
  }

  playback.stepIndex += 1;
  if (playback.stepIndex >= playback.route.steps.length) {
    if (activeRouteId === playback.route.id) {
      stopActiveBenchmarkRoute(`${playback.route.name} · 完成`, 'completed');
    } else {
      stopBenchmarkRoute(runtimeState, 'completed');
    }
    return false;
  }

  const step = playback.route.steps[playback.stepIndex];
  const duration = Number.isFinite(step.duration) ? Math.max(step.duration, 0) : 1.35;
  const hold = Number.isFinite(step.hold) ? Math.max(step.hold, 0) : 0.35;
  const immediate = duration === 0;
  setOrbitPreset(runtimeState.orbit, vec3(step.position), vec3(step.target), immediate, duration);
  playback.stepRemaining = duration + hold;
  runtimeState.requestRender?.();

  if (activeRouteId === playback.route.id) {
    routeSummary.textContent = `${playback.route.name} · ${playback.stepIndex + 1}/${playback.route.steps.length}`;
  }

  return true;
}

function updateBenchmarkRoute(runtimeState, dt) {
  const playback = runtimeState?.routePlayback;

  if (!playback) {
    return false;
  }

  playback.stepRemaining -= dt;
  if (playback.stepRemaining > 0) {
    return false;
  }

  return advanceBenchmarkRoute(runtimeState);
}

function captureCurrentView(runtimeState) {
  if (!runtimeState?.orbit) {
    return null;
  }

  const { orbit } = runtimeState;
  return {
    target: orbit.currentTarget.clone(),
    yaw: orbit.currentYaw,
    pitch: orbit.currentPitch,
    distance: orbit.currentDistance
  };
}

function restoreCurrentView(runtimeState, snapshot) {
  if (!runtimeState?.orbit || !snapshot) {
    return false;
  }

  const { orbit } = runtimeState;
  const clampedPitch = clampOrbitPitch(snapshot.pitch);
  orbit.transition = null;
  orbit.currentTarget.copy(snapshot.target);
  orbit.desiredTarget.copy(snapshot.target);
  orbit.currentYaw = snapshot.yaw;
  orbit.desiredYaw = snapshot.yaw;
  orbit.currentPitch = clampedPitch;
  orbit.desiredPitch = clampedPitch;
  orbit.currentDistance = snapshot.distance;
  orbit.desiredDistance = snapshot.distance;
  applyOrbit(orbit, 1);
  runtimeState.requestRender?.();
  return true;
}

function configureUnifiedGsplat(app, variant) {
  if (!variant?.unified || !variant.unifiedTuning || !app?.scene?.gsplat) {
    return null;
  }

  const baseProfile = normalizeUnifiedGsplatProfile(variant.unifiedTuning);
  applyUnifiedGsplatProfile(app.scene.gsplat, baseProfile);

  return {
    mode: 'base',
    baseProfile,
    warmSecondsRemaining: 0,
    riskSnapshot: null
  };
}

function normalizeUnifiedGsplatProfile(profile) {
  return {
    lodUnderfillLimit: Number.isFinite(profile?.lodUnderfillLimit) ? profile.lodUnderfillLimit : undefined,
    cooldownTicks: Number.isFinite(profile?.cooldownTicks) ? profile.cooldownTicks : undefined,
    lodUpdateDistance: Number.isFinite(profile?.lodUpdateDistance) ? profile.lodUpdateDistance : undefined,
    lodUpdateAngle: Number.isFinite(profile?.lodUpdateAngle) ? profile.lodUpdateAngle : undefined,
    lodBehindPenalty: Number.isFinite(profile?.lodBehindPenalty) ? profile.lodBehindPenalty : undefined
  };
}

function applyUnifiedGsplatProfile(sceneGsplat, profile) {
  if (!sceneGsplat || !profile) {
    return false;
  }

  let changed = false;
  for (const [key, value] of Object.entries(profile)) {
    if (!Number.isFinite(value) || sceneGsplat[key] === value) {
      continue;
    }

    sceneGsplat[key] = value;
    changed = true;
  }

  return changed;
}

function updateUnifiedLodWarmup(runtimeState, dt, isMoving) {
  const state = runtimeState?.unifiedLodState;
  const orbit = runtimeState?.orbit;

  if (!state || !orbit) {
    return false;
  }

  const riskSnapshot = getUnifiedLodRiskSnapshot(orbit);
  state.riskSnapshot = riskSnapshot;

  if (riskSnapshot.shouldPrewarm) {
    const refillSeconds = isMoving ? lowAnglePrewarmLeadSeconds : lowAnglePrewarmHoldSeconds;
    state.warmSecondsRemaining = Math.min(
      lowAnglePrewarmMaxSeconds,
      Math.max(state.warmSecondsRemaining, refillSeconds)
    );
  }
  const nextMode = state.warmSecondsRemaining > 0 ? 'warmup' : 'base';
  const modeChanged = state.mode !== nextMode;

  if (modeChanged) {
    state.mode = nextMode;
    if (runtimeState.routeRecord) {
      runtimeState.routeRecord.lodWarmups.push({
        elapsedMs: roundNumber(performance.now() - runtimeState.routeRecord.startedPerfTime),
        mode: nextMode,
        pitch: riskSnapshot.pitchDeg,
        distance: riskSnapshot.distance,
        score: riskSnapshot.score
      });
    }
  }

  if (state.warmSecondsRemaining > 0) {
    state.warmSecondsRemaining = Math.max(0, state.warmSecondsRemaining - dt);
  }

  return modeChanged;
}

function isUnifiedLodWarmupActive(runtimeState) {
  return (runtimeState?.unifiedLodState?.warmSecondsRemaining ?? 0) > 0;
}

function getUnifiedLodRiskSnapshot(orbit) {
  const pitchDeg = Math.abs(Math.round(radToDeg(orbit.currentPitch)));
  const distance = roundNumber(orbit.currentDistance, 3);
  const pitchScore = clamp((lowAnglePrewarmPitchThresholdDeg - pitchDeg) / lowAnglePrewarmPitchThresholdDeg, 0, 1);
  const distanceScore = clamp((lowAnglePrewarmDistanceThreshold - distance) / lowAnglePrewarmDistanceThreshold, 0, 1);
  const score = roundNumber(pitchScore * 0.7 + distanceScore * 0.3, 2);

  return {
    pitchDeg,
    distance,
    score,
    shouldPrewarm: pitchDeg <= lowAnglePrewarmPitchThresholdDeg && distance <= lowAnglePrewarmDistanceThreshold
  };
}

function createLoopController(app) {
  const originalTick = app.tick.bind(app);
  let sleeping = false;

  return {
    get isSleeping() {
      return sleeping;
    },
    sleep() {
      if (sleeping) {
        return;
      }

      sleeping = true;
      app.tick = () => {};
    },
    wake() {
      if (!sleeping) {
        return;
      }

      sleeping = false;
      app.tick = originalTick;
      window.requestAnimationFrame((timestamp) => {
        originalTick(timestamp);
      });
    }
  };
}

function initLongTaskObserver() {
  if (typeof PerformanceObserver === 'undefined') {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTaskBuffer.push({
          startTime: entry.startTime,
          duration: entry.duration
        });
      }
    });

    observer.observe({ type: 'longtask', buffered: true });
  } catch {
    return;
  }
}

function createRouteRunRecord(route, variantId) {
  const variant = variantsById.get(variantId);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    suiteId: activeSuiteRunId,
    routeId: route.id,
    routeName: route.name,
    variantId,
    variantName: variant?.name ?? variantId,
    renderScalePercent: activeRenderScalePercent,
    startedAt: Date.now(),
    startedPerfTime: performance.now(),
    longTaskStartIndex: longTaskBuffer.length,
    resourceStartIndex: performance.getEntriesByType('resource').length,
    frames: [],
    lodWarmups: []
  };
}

function recordRouteFrame(runtimeState, dt) {
  const { orbit, routeRecord, routePlayback } = runtimeState ?? {};
  if (!orbit || !routeRecord || !routePlayback) {
    return;
  }

  const position = orbit.camera.getPosition();
  const target = orbit.currentTarget;
  routeRecord.frames.push([
    Number((performance.now() - routeRecord.startedPerfTime).toFixed(2)),
    Number((dt * 1000).toFixed(2)),
    routePlayback.stepIndex,
    Number(position.x.toFixed(3)),
    Number(position.y.toFixed(3)),
    Number(position.z.toFixed(3)),
    Number(target.x.toFixed(3)),
    Number(target.y.toFixed(3)),
    Number(target.z.toFixed(3)),
    Number(orbit.currentDistance.toFixed(3)),
    Math.round(radToDeg(orbit.currentPitch)),
    Math.round(radToDeg(orbit.currentYaw))
  ]);
}

function finalizeRouteRunRecord(runtimeState, status) {
  const record = runtimeState?.routeRecord;
  if (!record) {
    return null;
  }

  const finishedPerfTime = performance.now();
  const metrics = snapshotBenchmarkMetrics(runtimeState.benchmark);
  const longTasks = getRouteRunLongTasks(record, finishedPerfTime);
  const modelResources = getRouteRunModelResources(record, finishedPerfTime);
  const analysis = analyzeRouteRun(record, longTasks, modelResources);
  const finalizedRecord = {
    ...record,
    status,
    finishedAt: Date.now(),
    loadMs: runtimeState.benchmark.loadMs,
    firstFrameMs: runtimeState.benchmark.firstFrameMs,
    motionAvgMs: metrics.averageMs,
    motionMaxMs: metrics.maxMs,
    analysis,
    trace: {
      frames: record.frames,
      longTasks,
      modelResources,
      lodWarmups: record.lodWarmups
    }
  };

  routeRunHistory.unshift(finalizedRecord);
  routeRunHistory.length = Math.min(routeRunHistory.length, maxRouteRunHistory);
  persistRouteRunHistory(routeRunHistory);
  renderRouteRunHistory();
  renderRouteAnalysis();
  runtimeState.routeRecord = null;
  return finalizedRecord;
}

function snapshotBenchmarkMetrics(benchmark) {
  if (!benchmark) {
    return {
      averageMs: null,
      maxMs: null
    };
  }

  const averageMs = benchmark.wasMoving && benchmark.motionFrames > 0 && benchmark.motionTime > 0
    ? (benchmark.motionTime / benchmark.motionFrames) * 1000
    : benchmark.lastMotionMs;
  const maxMs = benchmark.wasMoving && Number.isFinite(benchmark.motionMaxMs)
    ? benchmark.motionMaxMs
    : benchmark.lastMotionMaxMs;

  return {
    averageMs: Number.isFinite(averageMs) ? averageMs : null,
    maxMs: Number.isFinite(maxMs) ? maxMs : null
  };
}

function getRouteRunLongTasks(record, finishedPerfTime) {
  return longTaskBuffer
    .slice(record.longTaskStartIndex)
    .filter((entry) => entry.startTime <= finishedPerfTime && entry.startTime + entry.duration >= record.startedPerfTime)
    .map((entry) => ({
      startMs: Number((entry.startTime - record.startedPerfTime).toFixed(2)),
      durationMs: Number(entry.duration.toFixed(2))
    }));
}

function getRouteRunModelResources(record, finishedPerfTime) {
  return performance.getEntriesByType('resource')
    .slice(record.resourceStartIndex)
    .filter((entry) => entry.startTime <= finishedPerfTime)
    .filter((entry) => isTrackedModelResource(entry.name))
    .map((entry) => ({
      name: simplifyResourceName(entry.name),
      startMs: Number((entry.startTime - record.startedPerfTime).toFixed(2)),
      durationMs: Number(entry.duration.toFixed(2)),
      transferSize: entry.transferSize ?? 0,
      encodedBodySize: entry.encodedBodySize ?? 0
    }));
}

function analyzeRouteRun(record, longTasks, modelResources) {
  const frames = record.frames ?? [];
  const frameTimes = frames.map((frame) => frame[frameSampleIndices.dtMs]);
  const frameStats = summarizeFrameTimes(frameTimes);
  const stepStats = summarizeFrameSteps(frames, record.routeId);
  const stallWindows = detectStallWindows(frames, longTasks, modelResources, record.routeId);

  return {
    frameStats,
    stepStats,
    stallCount: stallWindows.length,
    severeStallCount: stallWindows.filter((stall) => stall.peakMs >= severeStallFrameThresholdMs).length,
    totalStallMs: Number(stallWindows.reduce((sum, stall) => sum + stall.durationMs, 0).toFixed(2)),
    hotspots: stallWindows.slice(0, 5)
  };
}

function summarizeFrameTimes(frameTimes) {
  if (frameTimes.length === 0) {
    return {
      sampleCount: 0,
      avgMs: null,
      p95Ms: null,
      p99Ms: null,
      peakMs: null
    };
  }

  return {
    sampleCount: frameTimes.length,
    avgMs: roundNumber(frameTimes.reduce((sum, value) => sum + value, 0) / frameTimes.length),
    p95Ms: roundNumber(computeQuantile(frameTimes, 0.95)),
    p99Ms: roundNumber(computeQuantile(frameTimes, 0.99)),
    peakMs: roundNumber(Math.max(...frameTimes))
  };
}

function summarizeFrameSteps(frames, routeId) {
  const grouped = new Map();

  for (const frame of frames) {
    const stepIndex = frame[frameSampleIndices.stepIndex];
    if (!grouped.has(stepIndex)) {
      grouped.set(stepIndex, []);
    }

    grouped.get(stepIndex)?.push(frame[frameSampleIndices.dtMs]);
  }

  return [...grouped.entries()].map(([stepIndex, values]) => ({
    stepIndex,
    label: getRouteStepLabel(routeId, stepIndex),
    avgMs: roundNumber(values.reduce((sum, value) => sum + value, 0) / values.length),
    p95Ms: roundNumber(computeQuantile(values, 0.95)),
    peakMs: roundNumber(Math.max(...values)),
    sampleCount: values.length
  }));
}

function detectStallWindows(frames, longTasks, modelResources, routeId) {
  const windows = [];
  let activeWindow = null;

  for (const frame of frames) {
    const dtMs = frame[frameSampleIndices.dtMs];
    if (dtMs <= stallFrameThresholdMs) {
      if (activeWindow) {
        windows.push(finalizeStallWindow(activeWindow, longTasks, modelResources, routeId));
        activeWindow = null;
      }
      continue;
    }

    if (!activeWindow) {
      activeWindow = {
        startMs: frame[frameSampleIndices.elapsedMs],
        endMs: frame[frameSampleIndices.elapsedMs] + dtMs,
        frames: [frame],
        peakFrame: frame
      };
      continue;
    }

    activeWindow.endMs = frame[frameSampleIndices.elapsedMs] + dtMs;
    activeWindow.frames.push(frame);
    if (dtMs > activeWindow.peakFrame[frameSampleIndices.dtMs]) {
      activeWindow.peakFrame = frame;
    }
  }

  if (activeWindow) {
    windows.push(finalizeStallWindow(activeWindow, longTasks, modelResources, routeId));
  }

  return windows.sort((a, b) => b.peakMs - a.peakMs);
}

function finalizeStallWindow(window, longTasks, modelResources, routeId) {
  const frameTimes = window.frames.map((frame) => frame[frameSampleIndices.dtMs]);
  const peakFrame = window.peakFrame;
  const overlappingLongTasks = longTasks.filter((task) => rangesOverlap(task.startMs, task.startMs + task.durationMs, window.startMs, window.endMs));
  const nearbyResources = modelResources.filter((resource) => rangesOverlap(resource.startMs, resource.startMs + resource.durationMs, window.startMs - 150, window.endMs + 150));

  return {
    startMs: roundNumber(window.startMs),
    endMs: roundNumber(window.endMs),
    durationMs: roundNumber(window.endMs - window.startMs),
    frameCount: window.frames.length,
    avgMs: roundNumber(frameTimes.reduce((sum, value) => sum + value, 0) / frameTimes.length),
    peakMs: roundNumber(Math.max(...frameTimes)),
    stepIndex: peakFrame[frameSampleIndices.stepIndex],
    stepLabel: getRouteStepLabel(routeId, peakFrame[frameSampleIndices.stepIndex]),
    camera: {
      position: [
        peakFrame[frameSampleIndices.posX],
        peakFrame[frameSampleIndices.posY],
        peakFrame[frameSampleIndices.posZ]
      ],
      target: [
        peakFrame[frameSampleIndices.targetX],
        peakFrame[frameSampleIndices.targetY],
        peakFrame[frameSampleIndices.targetZ]
      ],
      distance: peakFrame[frameSampleIndices.distance],
      pitch: peakFrame[frameSampleIndices.pitch],
      yaw: peakFrame[frameSampleIndices.yaw]
    },
    longTaskCount: overlappingLongTasks.length,
    longTaskMs: roundNumber(overlappingLongTasks.reduce((sum, task) => sum + task.durationMs, 0)),
    modelResourceCount: nearbyResources.length,
    likelyCause: inferStallCause(overlappingLongTasks, nearbyResources, peakFrame[frameSampleIndices.dtMs]),
    resources: nearbyResources.slice(0, 4)
  };
}

function inferStallCause(longTasks, modelResources, peakMs) {
  if (longTasks.length > 0) {
    return '主线程长任务';
  }

  if (modelResources.length > 0) {
    return '模型资源加载 / LOD 补载';
  }

  if (peakMs >= severeStallFrameThresholdMs) {
    return '视角相关排序 / GPU 峰值';
  }

  return '相机变化期的渲染波动';
}

function computeQuantile(values, quantile) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * quantile;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  if (lower === upper) {
    return sorted[lower];
  }

  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA <= endB && endA >= startB;
}

function roundNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(digits));
}

function isTrackedModelResource(name) {
  return name.includes('/models/');
}

function simplifyResourceName(name) {
  try {
    const url = new URL(name, window.location.href);
    return url.pathname;
  } catch {
    return name;
  }
}

function getRouteStepLabel(routeId, stepIndex) {
  const route = routeId ? benchmarkRoutesById.get(routeId) : null;
  const totalSteps = route?.steps?.length ?? null;
  const ordinal = Number.isFinite(stepIndex) ? stepIndex + 1 : 0;
  return totalSteps
    ? `Step ${ordinal}/${totalSteps}`
    : `Step ${ordinal}`;
}

function renderRouteRunHistory() {
  routeLogSummary.textContent = routeRunHistory.length > 0 ? `${routeRunHistory.length} 条` : '暂无';
  routeLogList.replaceChildren();

  if (routeRunHistory.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'route-log-empty';
    empty.textContent = '跑一次轨迹后，这里会自动留下对比记录。';
    routeLogList.append(empty);
    return;
  }

  for (const entry of routeRunHistory) {
    const item = document.createElement('article');
    item.className = 'route-log-item';
    item.innerHTML = `
      <div class="route-log-line">
        <strong>${entry.routeName}</strong>
        <span class="route-log-status is-${entry.status}">${formatRouteRunStatus(entry.status)}</span>
      </div>
      <div class="route-log-meta">${entry.variantName} · ${entry.renderScalePercent}% · ${formatRouteRunTime(entry.finishedAt ?? entry.startedAt)}</div>
      <div class="route-log-metrics">
        <span>漫游 ${formatMetricMs(entry.motionAvgMs)} / ${formatMetricPeakMs(entry.motionMaxMs)}</span>
        <span>首帧 ${formatMetricMs(entry.firstFrameMs)}</span>
      </div>
    `;
    routeLogList.append(item);
  }
}

function renderRouteAnalysis() {
  const records = getLatestSuiteRecords();
  routeAnalysisRanking.replaceChildren();
  routeAnalysisHotspots.replaceChildren();

  if (records.length === 0) {
    routeAnalysisSummary.textContent = '等待批量测试';
    routeAnalysisCopyNote.textContent = '跑完一轮标准测试后可复制。';
    routeAnalysisRanking.innerHTML = '<div class="route-analysis-empty">运行“当前轨迹 × 全版本”后，这里会出现排行榜和卡顿热点。</div>';
    routeAnalysisHotspots.innerHTML = '';
    return;
  }

  const summary = buildRouteAnalysisSummary(records);
  routeAnalysisSummary.textContent = `${summary.routeName} · ${records.length} 版`;
  routeAnalysisCopyNote.textContent = `最新批次：${summary.suiteId} · 可复制或下载`;

  for (const item of summary.ranking) {
    const card = document.createElement('article');
    card.className = 'route-analysis-item';
    card.innerHTML = `
      <div class="route-analysis-line">
        <strong>${item.variantName}</strong>
        <span>${item.avgMs} / ${item.peakMs} ms</span>
      </div>
      <div class="route-analysis-meta">P95 ${item.p95Ms} · P99 ${item.p99Ms} · 卡顿 ${item.stallCount} 次</div>
      <div class="route-analysis-meta">最差段 ${item.worstStepLabel} · P95 ${item.worstStepP95Ms} · 峰值 ${item.worstStepPeakMs}</div>
    `;
    routeAnalysisRanking.append(card);
  }

  if (summary.hotspots.length === 0) {
    routeAnalysisHotspots.innerHTML = '<div class="route-analysis-empty">这一批次还没采到明显卡顿热点。</div>';
    return;
  }

  for (const hotspot of summary.hotspots) {
    const card = document.createElement('article');
    card.className = 'route-hotspot-item';
    card.innerHTML = `
      <div class="route-analysis-line">
        <strong>${hotspot.variantName}</strong>
        <span>${hotspot.peakMs} ms</span>
      </div>
      <div class="route-analysis-meta">${hotspot.stepLabel} · ${hotspot.likelyCause}</div>
      <div class="route-analysis-meta">窗口 ${hotspot.startMs}-${hotspot.endMs} ms · 长任务 ${hotspot.longTaskCount} 次 / 资源 ${hotspot.modelResourceCount} 次</div>
      <div class="route-analysis-meta">视角 ${hotspot.camera.distance}m · ${hotspot.camera.pitch}° / ${hotspot.camera.yaw}°</div>
      ${hotspot.resourceSummary ? `<div class="route-analysis-meta">${hotspot.resourceSummary}</div>` : ''}
    `;
    routeAnalysisHotspots.append(card);
  }
}

function getLatestSuiteRecords() {
  const latestSuiteId = routeRunHistory.find((entry) => entry.suiteId)?.suiteId;
  if (!latestSuiteId) {
    return [];
  }

  return routeRunHistory.filter((entry) => entry.suiteId === latestSuiteId);
}

function buildRouteAnalysisSummary(records) {
  const sorted = [...records].sort((left, right) => (left.analysis?.frameStats?.avgMs ?? Infinity) - (right.analysis?.frameStats?.avgMs ?? Infinity));
  const hotspots = records
    .flatMap((record) => (record.analysis?.hotspots ?? []).map((hotspot) => ({
      ...hotspot,
      variantId: record.variantId,
      variantName: record.variantName,
      resourceSummary: formatHotspotResourceSummary(hotspot.resources)
    })))
    .sort((left, right) => right.peakMs - left.peakMs)
    .slice(0, 5);

  return {
    suiteId: records[0]?.suiteId ?? 'manual',
    routeName: records[0]?.routeName ?? '未知轨迹',
    ranking: sorted.map((record) => ({
      variantId: record.variantId,
      variantName: record.variantName,
      avgMs: formatMetricText(record.analysis?.frameStats?.avgMs),
      p95Ms: formatMetricText(record.analysis?.frameStats?.p95Ms),
      p99Ms: formatMetricText(record.analysis?.frameStats?.p99Ms),
      peakMs: formatMetricText(record.analysis?.frameStats?.peakMs),
      stallCount: record.analysis?.stallCount ?? 0,
      worstStepLabel: formatWorstStepLabel(record.analysis?.stepStats),
      worstStepP95Ms: formatMetricText(getWorstStep(record.analysis?.stepStats)?.p95Ms),
      worstStepPeakMs: formatMetricText(getWorstStep(record.analysis?.stepStats)?.peakMs)
    })),
    hotspots
  };
}

async function copyLatestRouteAnalysis(mode) {
  const exportPayload = getLatestRouteAnalysisExport();
  if (!exportPayload) {
    setRouteAnalysisCopyNote('还没有可导出的标准测试结果。');
    return;
  }

  const textPayload = mode === 'json'
    ? JSON.stringify(exportPayload, null, 2)
    : formatRouteAnalysisSummaryText(exportPayload.summary, exportPayload.records);

  try {
    await navigator.clipboard.writeText(textPayload);
    setRouteAnalysisCopyNote(mode === 'json' ? '已复制 JSON。' : '已复制摘要。');
  } catch {
    setRouteAnalysisCopyNote('复制失败，可能是浏览器权限限制。');
  }
}

function downloadLatestRouteAnalysisJson() {
  const exportPayload = getLatestRouteAnalysisExport();
  if (!exportPayload) {
    setRouteAnalysisCopyNote('还没有可导出的标准测试结果。');
    return;
  }

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const routeSlug = exportPayload.summary.routeName.replace(/[^\p{Letter}\p{Number}-]+/gu, '-').replace(/-+/g, '-');
  const link = document.createElement('a');
  link.href = url;
  link.download = `ruoshui-route-analysis-${routeSlug}-${exportPayload.summary.suiteId}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  setRouteAnalysisCopyNote('已下载 JSON。');
}

function setRouteAnalysisCopyNote(text) {
  routeAnalysisCopyNote.textContent = text;
  if (routeAnalysisCopyTimeoutId) {
    window.clearTimeout(routeAnalysisCopyTimeoutId);
  }

  routeAnalysisCopyTimeoutId = window.setTimeout(() => {
    const records = getLatestSuiteRecords();
    routeAnalysisCopyNote.textContent = records.length > 0
      ? `最新批次：${records[0].suiteId} · 可复制或下载`
      : '跑完一轮标准测试后可复制。';
    routeAnalysisCopyTimeoutId = null;
  }, routeAnalysisCopyFeedbackMs);
}

function formatRouteAnalysisSummaryText(summary, records) {
  const rankingLines = summary.ranking
    .map((item, index) => `${index + 1}. ${item.variantName}: avg ${item.avgMs}, p95 ${item.p95Ms}, peak ${item.peakMs}, stalls ${item.stallCount}, worst ${item.worstStepLabel} (${item.worstStepP95Ms})`)
    .join('\n');
  const hotspotLines = summary.hotspots.length > 0
    ? summary.hotspots
      .map((hotspot, index) => `${index + 1}. ${hotspot.variantName} / ${hotspot.stepLabel}: ${hotspot.peakMs} ms, ${hotspot.likelyCause}, 视角 ${hotspot.camera.distance}m ${hotspot.camera.pitch}°/${hotspot.camera.yaw}°, 资源 ${hotspot.modelResourceCount}, 长任务 ${hotspot.longTaskCount}`)
      .join('\n')
    : '无明显热点';

  return [
    `Suite: ${summary.suiteId}`,
    `Route: ${summary.routeName}`,
    '',
    'Ranking:',
    rankingLines,
    '',
    'Hotspots:',
    hotspotLines,
    '',
    `Records: ${records.length}`
  ].join('\n');
}

function getLatestRouteAnalysisExport() {
  const records = getLatestSuiteRecords();
  if (records.length === 0) {
    return null;
  }

  return {
    exportedAt: new Date().toISOString(),
    frameSchema: Object.keys(frameSampleIndices),
    summary: buildRouteAnalysisSummary(records),
    records
  };
}

function getWorstStep(stepStats) {
  if (!Array.isArray(stepStats) || stepStats.length === 0) {
    return null;
  }

  return [...stepStats].sort((left, right) => {
    const p95Diff = (right.p95Ms ?? -Infinity) - (left.p95Ms ?? -Infinity);
    if (p95Diff !== 0) {
      return p95Diff;
    }

    return (right.peakMs ?? -Infinity) - (left.peakMs ?? -Infinity);
  })[0];
}

function formatWorstStepLabel(stepStats) {
  const worstStep = getWorstStep(stepStats);
  return worstStep?.label ?? '—';
}

function formatHotspotResourceSummary(resources) {
  if (!Array.isArray(resources) || resources.length === 0) {
    return '';
  }

  return `资源 ${resources.map((resource) => resource.name).join(' · ')}`;
}

function installRouteAnalysisBridge() {
  window.__ruoshuiPerf = {
    latest() {
      return getLatestRouteAnalysisExport();
    },
    history() {
      return routeRunHistory;
    },
    copySummary() {
      return copyLatestRouteAnalysis('summary');
    },
    copyJson() {
      return copyLatestRouteAnalysis('json');
    },
    clearHistory() {
      routeRunHistory.length = 0;
      persistRouteRunHistory(routeRunHistory);
      renderRouteRunHistory();
      renderRouteAnalysis();
    },
    variants() {
      return data.variants.map((variant) => ({ id: variant.id, name: variant.name }));
    },
    routes() {
      return benchmarkRoutes.map((route) => ({ id: route.id, name: route.name }));
    },
    async runVariantRoute(options = {}) {
      if (options.clearHistory) {
        this.clearHistory();
      }

      return runVariantRouteBenchmark({
        routeId: options.routeId,
        variantId: options.variantId,
        repeatCount: options.repeatCount,
        suitePrefix: options.suitePrefix ?? 'single'
      });
    },
    async waitForIdle() {
      if (!activeBenchmarkRunPromise) {
        return null;
      }

      return activeBenchmarkRunPromise;
    }
  };
}

function getInitialRouteRunHistory() {
  try {
    const saved = window.localStorage.getItem(routeRunHistoryStorageKey);
    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.slice(0, maxRouteRunHistory) : [];
  } catch {
    return [];
  }
}

function persistRouteRunHistory(history) {
  try {
    window.localStorage.setItem(routeRunHistoryStorageKey, JSON.stringify(history));
  } catch {
    return;
  }
}

function beginVariantBenchmark(variantId) {
  const benchmark = {
    loadMs: null,
    firstFrameMs: null,
    motionTime: 0,
    motionFrames: 0,
    motionMaxMs: null,
    lastMotionMs: null,
    lastMotionMaxMs: null,
    wasMoving: false
  };
  variantBenchmarks.set(variantId, benchmark);
  return benchmark;
}

function getVariantBenchmark(variantId) {
  if (!variantId) {
    return null;
  }

  if (!variantBenchmarks.has(variantId)) {
    return beginVariantBenchmark(variantId);
  }

  return variantBenchmarks.get(variantId) ?? null;
}

function publishVariantBenchmark(variantId) {
  if (variantId === activeVariantId) {
    renderVariantBenchmark(variantId);
  }
}

function renderVariantBenchmark(variantId) {
  const benchmark = getVariantBenchmark(variantId);
  metricLoad.textContent = formatMetricMs(benchmark?.loadMs);
  metricFirstFrame.textContent = formatMetricMs(benchmark?.firstFrameMs);
  metricMotion.textContent = formatMotionMetric(benchmark);
}

function beginMotionSession(benchmark) {
  if (!benchmark) {
    return;
  }

  benchmark.motionTime = 0;
  benchmark.motionFrames = 0;
  benchmark.motionMaxMs = null;
  benchmark.wasMoving = true;
}

function sampleMotionFrame(benchmark, dt) {
  if (!benchmark) {
    return;
  }

  if (!benchmark.wasMoving) {
    beginMotionSession(benchmark);
  }

  benchmark.motionFrames += 1;
  benchmark.motionTime += dt;
  const frameMs = dt * 1000;
  benchmark.motionMaxMs = benchmark.motionMaxMs === null
    ? frameMs
    : Math.max(benchmark.motionMaxMs, frameMs);
}

function endMotionSession(benchmark) {
  if (!benchmark?.wasMoving) {
    return false;
  }

  benchmark.wasMoving = false;
  if (benchmark.motionFrames > 0 && benchmark.motionTime > 0) {
    benchmark.lastMotionMs = (benchmark.motionTime / benchmark.motionFrames) * 1000;
    benchmark.lastMotionMaxMs = benchmark.motionMaxMs;
    return true;
  }

  return false;
}

function trackFirstFrame(app, variantId, switchStartedAt) {
  if (!Number.isFinite(switchStartedAt)) {
    return;
  }

  const resolveFirstFrame = () => {
    const benchmark = getVariantBenchmark(variantId);
    if (!benchmark || Number.isFinite(benchmark.firstFrameMs)) {
      return;
    }

    benchmark.firstFrameMs = performance.now() - switchStartedAt;
    publishVariantBenchmark(variantId);
  };

  app.once('frameend', resolveFirstFrame);
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(resolveFirstFrame);
  });
}

function vec3(tuple) {
  return new pc.Vec3(tuple[0], tuple[1], tuple[2]);
}

function createOrbitController(camera, canvasElement, initialPosition, initialTarget, performanceMode) {
  const spherical = positionToOrbit(initialPosition, initialTarget);

  const orbit = {
    camera,
    canvasElement,
    currentTarget: initialTarget.clone(),
    desiredTarget: initialTarget.clone(),
    currentYaw: spherical.yaw,
    desiredYaw: spherical.yaw,
    currentPitch: spherical.pitch,
    desiredPitch: spherical.pitch,
    currentDistance: spherical.distance,
    desiredDistance: spherical.distance,
    minDistance: 0.35,
    maxDistance: 12,
    rotateSpeed: 0.0055,
    panSpeed: 0.0018,
    zoomSpeed: 0.0012,
    damping: 0.14,
    pointerMode: null,
    lastX: 0,
    lastY: 0,
    transition: null,
    onManualInput: null,
    tempRight: new pc.Vec3(),
    tempUp: new pc.Vec3(),
    tempPosition: new pc.Vec3()
  };

  const beginPointer = (event) => {
    orbit.onManualInput?.();
    orbit.pointerMode = event.button === 2 ? 'pan' : 'rotate';
    if (performanceMode) {
      performanceMode.isInteracting = true;
    }
    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;
  };

  const endPointer = () => {
    orbit.cancelInteraction();
  };

  const movePointer = (event) => {
    if (!orbit.pointerMode) {
      return;
    }

    const dx = event.clientX - orbit.lastX;
    const dy = event.clientY - orbit.lastY;
    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;

    if (orbit.pointerMode === 'rotate') {
      orbit.transition = null;
      orbit.desiredYaw -= dx * orbit.rotateSpeed;
      orbit.desiredPitch = clampOrbitPitch(orbit.desiredPitch - dy * orbit.rotateSpeed);
      return;
    }

    const distanceFactor = Math.max(orbit.currentDistance, 0.5);
    const right = orbit.tempRight.copy(camera.right).mulScalar(-dx * orbit.panSpeed * distanceFactor);
    const up = orbit.tempUp.copy(camera.up).mulScalar(dy * orbit.panSpeed * distanceFactor);
    orbit.transition = null;
    orbit.desiredTarget.add(right).add(up);
  };

  const onWheel = (event) => {
    event.preventDefault();
    orbit.onManualInput?.();
    orbit.transition = null;
    const scale = Math.exp(event.deltaY * orbit.zoomSpeed);
    orbit.desiredDistance = clamp(
      orbit.desiredDistance * scale,
      orbit.minDistance,
      orbit.maxDistance
    );
  };

  canvasElement.addEventListener('mousedown', beginPointer);
  window.addEventListener('mousemove', movePointer);
  window.addEventListener('mouseup', endPointer);
  canvasElement.addEventListener('wheel', onWheel, { passive: false });

  orbit.destroy = () => {
    canvasElement.removeEventListener('mousedown', beginPointer);
    window.removeEventListener('mousemove', movePointer);
    window.removeEventListener('mouseup', endPointer);
    canvasElement.removeEventListener('wheel', onWheel);
  };

  orbit.cancelInteraction = () => {
    orbit.pointerMode = null;
    if (performanceMode) {
      performanceMode.isInteracting = false;
    }
  };

  applyOrbit(orbit, 1);
  return orbit;
}

function setOrbitPreset(orbit, position, target, immediate, duration = 1.35) {
  const spherical = positionToOrbit(position, target);
  const clampedPitch = clampOrbitPitch(spherical.pitch);

  if (immediate) {
    orbit.transition = null;
    orbit.currentTarget.copy(target);
    orbit.desiredTarget.copy(target);
    orbit.currentYaw = spherical.yaw;
    orbit.desiredYaw = spherical.yaw;
    orbit.currentPitch = clampedPitch;
    orbit.desiredPitch = clampedPitch;
    orbit.currentDistance = spherical.distance;
    orbit.desiredDistance = spherical.distance;
    applyOrbit(orbit, 1);
    return;
  }

  orbit.transition = {
    elapsed: 0,
    duration: Math.max(duration, 0.01),
    fromTarget: orbit.desiredTarget.clone(),
    toTarget: target.clone(),
    fromYaw: orbit.desiredYaw,
    toYaw: spherical.yaw,
    fromPitch: orbit.desiredPitch,
    toPitch: clampedPitch,
    fromDistance: orbit.desiredDistance,
    toDistance: spherical.distance
  };
}

function updateOrbitController(orbit, dt) {
  if (orbit.transition) {
    orbit.transition.elapsed = Math.min(orbit.transition.elapsed + dt, orbit.transition.duration);
    const alpha = orbit.transition.elapsed / orbit.transition.duration;
    const eased = easeInOutCubic(alpha);

    orbit.desiredTarget.lerp(orbit.transition.fromTarget, orbit.transition.toTarget, eased);
    orbit.desiredYaw = lerpAngle(orbit.transition.fromYaw, orbit.transition.toYaw, eased);
    orbit.desiredPitch = lerp(orbit.transition.fromPitch, orbit.transition.toPitch, eased);
    orbit.desiredDistance = lerp(
      orbit.transition.fromDistance,
      orbit.transition.toDistance,
      eased
    );

    if (alpha >= 1) {
      orbit.transition = null;
    }
  }

  return applyOrbit(orbit, orbit.damping);
}

function applyOrbit(orbit, damping) {
  const previousTargetX = orbit.currentTarget.x;
  const previousTargetY = orbit.currentTarget.y;
  const previousTargetZ = orbit.currentTarget.z;
  const previousYaw = orbit.currentYaw;
  const previousPitch = orbit.currentPitch;
  const previousDistance = orbit.currentDistance;
  const blend = damping >= 1 ? 1 : 1 - Math.pow(1 - damping, 2);
  orbit.currentTarget.lerp(orbit.currentTarget, orbit.desiredTarget, blend);
  orbit.currentYaw = lerpAngle(orbit.currentYaw, orbit.desiredYaw, blend);
  orbit.currentPitch = lerp(orbit.currentPitch, orbit.desiredPitch, blend);
  orbit.currentDistance = lerp(orbit.currentDistance, orbit.desiredDistance, blend);

  const position = orbitToPosition(
    orbit.currentTarget,
    orbit.currentYaw,
    orbit.currentPitch,
    orbit.currentDistance,
    orbit.tempPosition
  );
  orbit.camera.setPosition(position);
  orbit.camera.lookAt(orbit.currentTarget);

  return (
    Math.abs(previousTargetX - orbit.currentTarget.x) > 0.00001 ||
    Math.abs(previousTargetY - orbit.currentTarget.y) > 0.00001 ||
    Math.abs(previousTargetZ - orbit.currentTarget.z) > 0.00001 ||
    Math.abs(previousYaw - orbit.currentYaw) > 0.00001 ||
    Math.abs(previousPitch - orbit.currentPitch) > 0.00001 ||
    Math.abs(previousDistance - orbit.currentDistance) > 0.00001
  );
}

function positionToOrbit(position, target) {
  const offset = position.clone().sub(target);
  const distance = Math.max(offset.length(), 0.0001);
  return {
    distance,
    yaw: Math.atan2(offset.x, offset.z),
    pitch: clampOrbitPitch(Math.asin(clamp(offset.y / distance, -1, 1)))
  };
}

function clampOrbitPitch(value) {
  return clamp(value, degToRad(minOrbitPitchDeg), degToRad(maxOrbitPitchDeg));
}

function orbitToPosition(target, yaw, pitch, distance, out = new pc.Vec3()) {
  const cosPitch = Math.cos(pitch);
  return out.set(
    target.x + Math.sin(yaw) * cosPitch * distance,
    target.y + Math.sin(pitch) * distance,
    target.z + Math.cos(yaw) * cosPitch * distance
  );
}

function renderCameraMeta(runtimeState) {
  if (!runtimeState?.orbit) {
    cameraPosition.textContent = '—';
    cameraTarget.textContent = '—';
    cameraDistance.textContent = '—';
    cameraAngle.textContent = '—';
    cameraSummary.textContent = '等待视角';
    return;
  }

  const { orbit } = runtimeState;
  const position = orbit.camera.getPosition();
  const target = orbit.currentTarget;
  const distance = orbit.currentDistance;
  const pitch = Math.round(radToDeg(orbit.currentPitch));
  const yaw = Math.round(radToDeg(orbit.currentYaw));
  const snapshot = [
    position.x.toFixed(2),
    position.y.toFixed(2),
    position.z.toFixed(2),
    target.x.toFixed(2),
    target.y.toFixed(2),
    target.z.toFixed(2),
    distance.toFixed(2),
    pitch,
    yaw
  ].join('|');

  if (runtimeState.lastCameraSnapshot === snapshot) {
    return;
  }

  runtimeState.lastCameraSnapshot = snapshot;
  cameraPosition.textContent = formatVec3(position);
  cameraTarget.textContent = formatVec3(target);
  cameraDistance.textContent = `${distance.toFixed(2)} m`;
  cameraAngle.textContent = `${pitch}° / ${yaw}°`;
  cameraSummary.textContent = `${distance.toFixed(2)} m · ${pitch}°`;
}

function renderPerfHud(runtimeState) {
  if (!showPerfHud || !perfFps || !perfMs || !perfRender || !perfScale) {
    return;
  }

  perfScale.textContent = `${activeRenderScalePercent}%`;

  if (!runtimeState?.app || !runtimeState?.performanceMode) {
    perfFps.textContent = '—';
    perfMs.textContent = '—';
    perfRender.textContent = '未加载';
    return;
  }

  const sampleTime = runtimeState.perfHudElapsed;
  const frameCount = runtimeState.perfHudFrames;
  if (sampleTime > 0 && frameCount > 0) {
    const fps = frameCount / sampleTime;
    const ms = (sampleTime / frameCount) * 1000;
    perfFps.textContent = `${Math.round(fps)}`;
    perfMs.textContent = `${ms.toFixed(1)} ms`;
  }

  const isRendering = runtimeState.app.autoRender || runtimeState.performanceMode.isInteracting;
  perfRender.textContent = isRendering ? '活动' : '静止';
  renderVariantBenchmark(activeVariantId);
}

function formatMetricMs(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }

  return `${Math.round(value)} ms`;
}

function formatMetricText(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }

  return `${Number(value).toFixed(1)} ms`;
}

function formatMetricPeakMs(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }

  return `${Math.round(value)} ms`;
}

function formatMotionMetric(benchmark) {
  if (!benchmark) {
    return '待采样';
  }

  const activeAverageMs = benchmark.wasMoving && benchmark.motionFrames >= 6 && benchmark.motionTime > 0
    ? (benchmark.motionTime / benchmark.motionFrames) * 1000
    : null;
  const averageMs = activeAverageMs ?? benchmark.lastMotionMs;

  if (!Number.isFinite(averageMs)) {
    return '待采样';
  }

  const maxMs = benchmark.wasMoving && Number.isFinite(benchmark.motionMaxMs)
    ? benchmark.motionMaxMs
    : benchmark.lastMotionMaxMs;

  if (!Number.isFinite(maxMs)) {
    return `${averageMs.toFixed(1)} ms`;
  }

  return `${averageMs.toFixed(1)} / ${maxMs.toFixed(0)} ms`;
}

function formatRouteRunStatus(status) {
  switch (status) {
    case 'completed':
      return '完成';
    case 'manual':
      return '手动';
    case 'switch':
      return '切换';
    default:
      return '中断';
  }
}

function formatRouteRunTime(timestamp) {
  if (!Number.isFinite(timestamp)) {
    return '—';
  }

  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatVec3(vector) {
  return `${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)}`;
}

function easeInOutCubic(value) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function degToRad(value) {
  return (value * Math.PI) / 180;
}

function radToDeg(value) {
  return (value * 180) / Math.PI;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(from, to, alpha) {
  return from + (to - from) * alpha;
}

function createPerformanceMode(runtimeWindow, lockedPercent) {
  const supportedMaxPixelRatio = getMaxSupportedPixelRatio(runtimeWindow);
  const initialPixelRatio = normalizeRenderScalePercent(lockedPercent) / 100;

  return {
    targetPixelRatio: initialPixelRatio,
    currentPixelRatio: initialPixelRatio,
    lockedPixelRatio: initialPixelRatio,
    supportedMaxPixelRatio,
    minPixelRatio: renderScaleMinPercent / 100,
    maxPixelRatio: initialPixelRatio,
    sampleTime: 0,
    frameCount: 0,
    cooldown: 0,
    isInteracting: false,
    isLocked: true
  };
}

function updatePerformanceMode(performanceMode, app, dt) {
  if (performanceMode.isLocked) {
    return false;
  }

  performanceMode.sampleTime += dt;
  performanceMode.frameCount += 1;
  performanceMode.cooldown = Math.max(0, performanceMode.cooldown - dt);

  if (performanceMode.sampleTime < 1.25 || performanceMode.cooldown > 0) {
    return false;
  }

  const fps = performanceMode.frameCount / performanceMode.sampleTime;
  let nextRatio = performanceMode.currentPixelRatio;

  if (fps < 42 && performanceMode.currentPixelRatio > performanceMode.minPixelRatio) {
    nextRatio = Math.max(performanceMode.minPixelRatio, performanceMode.currentPixelRatio - 0.1);
  } else if (
    fps > 56 &&
    !performanceMode.isInteracting &&
    performanceMode.currentPixelRatio < performanceMode.maxPixelRatio
  ) {
    nextRatio = Math.min(performanceMode.maxPixelRatio, performanceMode.currentPixelRatio + 0.05);
  }

  if (nextRatio !== performanceMode.currentPixelRatio) {
    performanceMode.currentPixelRatio = Number(nextRatio.toFixed(2));
    app.graphicsDevice.maxPixelRatio = performanceMode.currentPixelRatio;
    app.resizeCanvas();
    performanceMode.cooldown = 2.5;
    performanceMode.sampleTime = 0;
    performanceMode.frameCount = 0;
    return true;
  }

  performanceMode.sampleTime = 0;
  performanceMode.frameCount = 0;
  return false;
}

function lerpAngle(from, to, alpha) {
  const turn = Math.PI * 2;
  const delta = ((((to - from) % turn) + turn + Math.PI) % turn) - Math.PI;
  return from + delta * alpha;
}

function getMaxSupportedPixelRatio(runtimeWindow) {
  const deviceRatio = Math.max(runtimeWindow.devicePixelRatio || 1, 1);
  return deviceRatio >= 2 ? 1 : Math.min(deviceRatio, 1.15);
}

function normalizeRenderScalePercent(value) {
  const clamped = clamp(Number(value) || maxRenderScalePercent, renderScaleMinPercent, maxRenderScalePercent);
  return Math.round(clamped / 5) * 5;
}

function getInitialRenderScalePercent() {
  try {
    const savedPercent = window.localStorage.getItem(renderScaleStorageKey);
    if (savedPercent) {
      return normalizeRenderScalePercent(Number(savedPercent));
    }
  } catch {
    return maxRenderScalePercent;
  }

  return maxRenderScalePercent;
}

function persistRenderScalePercent(percent) {
  try {
    window.localStorage.setItem(renderScaleStorageKey, String(percent));
  } catch {
    return;
  }
}

function applyRenderScaleToRuntime(runtimeState, percent) {
  if (!runtimeState?.performanceMode || !runtimeState?.app) {
    return;
  }

  const nextRatio = normalizeRenderScalePercent(percent) / 100;
  runtimeState.performanceMode.isLocked = true;
  runtimeState.performanceMode.lockedPixelRatio = nextRatio;
  runtimeState.performanceMode.currentPixelRatio = nextRatio;
  runtimeState.performanceMode.targetPixelRatio = nextRatio;
  runtimeState.performanceMode.maxPixelRatio = nextRatio;
  runtimeState.app.graphicsDevice.maxPixelRatio = nextRatio;
  runtimeState.app.resizeCanvas();
  runtimeState.requestRender?.();
}
