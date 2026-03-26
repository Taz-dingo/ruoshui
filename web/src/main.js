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
const renderScaleMinPercent = 70;
const cameraMetaIntervalSeconds = 0.12;
const perfHudIntervalSeconds = 0.5;
const renderWakeSeconds = 0.25;
const variantsById = new Map(data.variants.map((variant) => [variant.id, variant]));
const benchmarkRoutes = data.benchmarkRoutes ?? [];
const benchmarkRoutesById = new Map(benchmarkRoutes.map((route) => [route.id, route]));
const firstPreset = data.presets[0];
const defaultVariant = variantsById.get(data.scene.defaultVariantId) ?? data.variants[0];
const maxRenderScalePercent = Math.round(getMaxSupportedPixelRatio(window) * 100);
let activeRenderScalePercent = getInitialRenderScalePercent();

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
const presetList = document.querySelector('#preset-list');
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
  !presetList ||
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
let currentLoadToken = 0;
let openInspectorPanel = null;

const variantButtons = new Map();
const routeButtons = new Map();
const presetButtons = new Map();
const variantBenchmarks = new Map();

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
renderVariantMeta(defaultVariant);
renderRenderScaleMeta(activeRenderScalePercent);
renderCameraMeta(null);
renderPerfHud(null);
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

async function activateVariant(variantId, initial = false) {
  const variant = variantsById.get(variantId);

  if (!variant) {
    return;
  }

  if (!initial && variantId === activeVariantId) {
    return;
  }

  if (activeRouteId) {
    stopActiveBenchmarkRoute();
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
    runtime.destroy();
    runtime = null;
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
    button.classList.toggle('is-active', routeId === activeRouteId);
  }
}

function setVariantButtonsDisabled(disabled) {
  for (const button of variantButtons.values()) {
    button.disabled = disabled;
  }
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

  const splatAsset = new pc.Asset(`ruoshui-${variant.id}`, 'gsplat', { url: variant.assetUrl });
  const benchmark = timings.benchmark ?? beginVariantBenchmark(variant.id);
  const assetLoadStartedAt = performance.now();

  await new Promise((resolve, reject) => {
    const loader = new pc.AssetListLoader([splatAsset], app.assets);
    const onError = (err, asset) => {
      app.assets.off('error', onError);
      reject(new Error(`加载 ${asset.name} 失败：${String(err)}`));
    };

    app.assets.on('error', onError);
    loader.load(() => {
      app.assets.off('error', onError);
      benchmark.loadMs = performance.now() - assetLoadStartedAt;
      publishVariantBenchmark(variant.id);
      resolve();
    });
  });

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
  app.root.addChild(splat);
  configureUnifiedGsplat(app, variant);

  const runtimeState = {
    variantId: variant.id,
    app,
    orbit,
    benchmark,
    performanceMode,
    loopController,
    routePlayback: null,
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
      window.removeEventListener('resize', handleResize);
      canvasElement.removeEventListener('contextmenu', preventContextMenu);
      orbit.destroy();
      app.destroy();
    }
  };

  orbit.onManualInput = () => {
    if (activeRouteId) {
      stopActiveBenchmarkRoute();
    }
    runtimeState.requestRender();
  };
  trackFirstFrame(app, variant.id, timings.switchStartedAt);

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
    const keepRendering =
      routeChanged || orbitChanged || performanceChanged || runtimeState.performanceMode.isInteracting;
    if (routeChanged || orbitChanged || runtimeState.performanceMode.isInteracting) {
      runtimeState.benchmark.motionFrames += 1;
      runtimeState.benchmark.motionTime += dt;
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

  return runtimeState;
}

function moveCamera(runtimeState, preset, immediate = false) {
  setOrbitPreset(runtimeState.orbit, vec3(preset.position), vec3(preset.target), immediate);
  runtimeState.requestRender();
}

function startBenchmarkRoute(runtimeState, route) {
  if (!runtimeState || !route?.steps?.length) {
    return;
  }

  runtimeState.routePlayback = {
    route,
    stepIndex: -1,
    stepRemaining: 0
  };
  advanceBenchmarkRoute(runtimeState);
}

function stopBenchmarkRoute(runtimeState) {
  if (!runtimeState) {
    return;
  }

  runtimeState.routePlayback = null;
}

function stopActiveBenchmarkRoute(summaryText = '未播放') {
  if (runtime) {
    stopBenchmarkRoute(runtime);
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
    runtimeState.routePlayback = null;
    if (activeRouteId === playback.route.id) {
      stopActiveBenchmarkRoute(`${playback.route.name} · 完成`);
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
  orbit.transition = null;
  orbit.currentTarget.copy(snapshot.target);
  orbit.desiredTarget.copy(snapshot.target);
  orbit.currentYaw = snapshot.yaw;
  orbit.desiredYaw = snapshot.yaw;
  orbit.currentPitch = snapshot.pitch;
  orbit.desiredPitch = snapshot.pitch;
  orbit.currentDistance = snapshot.distance;
  orbit.desiredDistance = snapshot.distance;
  applyOrbit(orbit, 1);
  runtimeState.requestRender?.();
  return true;
}

function configureUnifiedGsplat(app, variant) {
  if (!variant?.unified || !variant.unifiedTuning || !app?.scene?.gsplat) {
    return;
  }

  Object.assign(app.scene.gsplat, variant.unifiedTuning);
}

function createLoopController(app) {
  const originalTick = app.tick;
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
      window.requestAnimationFrame(app.tick);
    }
  };
}

function beginVariantBenchmark(variantId) {
  const benchmark = {
    loadMs: null,
    firstFrameMs: null,
    motionTime: 0,
    motionFrames: 0
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
      orbit.desiredPitch = clamp(
        orbit.desiredPitch - dy * orbit.rotateSpeed,
        degToRad(-89),
        degToRad(89)
      );
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

  if (immediate) {
    orbit.transition = null;
    orbit.currentTarget.copy(target);
    orbit.desiredTarget.copy(target);
    orbit.currentYaw = spherical.yaw;
    orbit.desiredYaw = spherical.yaw;
    orbit.currentPitch = spherical.pitch;
    orbit.desiredPitch = spherical.pitch;
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
    toPitch: spherical.pitch,
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
    pitch: Math.asin(clamp(offset.y / distance, -1, 1))
  };
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

function formatMotionMetric(benchmark) {
  if (!benchmark || benchmark.motionFrames < 6 || benchmark.motionTime <= 0) {
    return '待采样';
  }

  const averageMs = (benchmark.motionTime / benchmark.motionFrames) * 1000;
  return `${averageMs.toFixed(1)} ms`;
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
