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

const blurPresets = [
  { id: 'off', name: '关闭', summary: '完全去掉毛玻璃，最利落。', blur: 0, interactingBlur: 0 },
  { id: 'light', name: '轻', summary: '保留一点分层感，更偏性能。', blur: 8, interactingBlur: 2 },
  { id: 'medium', name: '中', summary: '当前默认观感，平衡氛围和清晰度。', blur: 14, interactingBlur: 6 },
  { id: 'strong', name: '强', summary: '更明显的玻璃感，强调氛围。', blur: 20, interactingBlur: 10 }
];
const blurPresetStorageKey = 'ruoshui-ui-blur-preset';
const renderScaleStorageKey = 'ruoshui-render-scale-percent';
const renderScaleMinPercent = 70;
const variantsById = new Map(data.variants.map((variant) => [variant.id, variant]));
const firstPreset = data.presets[0];
const firstHighlight = data.highlights[0];
const defaultVariant = variantsById.get(data.scene.defaultVariantId) ?? data.variants[0];
const maxRenderScalePercent = Math.round(getMaxSupportedPixelRatio(window) * 100);
let activeBlurPresetId = getInitialBlurPresetId();
let activeRenderScalePercent = getInitialRenderScalePercent();

applyBlurPreset(getBlurPreset(activeBlurPresetId));

appElement.innerHTML = `
  <main class="shell">
    <div class="scene" id="scene"></div>
    <div class="hud">
      <section class="rail">
        <div class="panel hero">
          <p class="eyebrow">Ruoshui Square · SOG Compare</p>
          <h1>${data.scene.title}</h1>
          <h2>${data.scene.subtitle}</h2>
          <p>${data.scene.summary}</p>
          <div class="hero-actions">
            <button class="button primary" id="focus-scene">进入场景</button>
            <button class="button secondary" id="focus-overview">切到全览</button>
          </div>
          <p class="microcopy">左键旋转 · 右键平移 · 滚轮缩放 · 先在同一镜头下切换不同版本比较体感</p>
        </div>

        <div class="panel status-strip" aria-live="polite">
          <span class="status-dot"></span>
          <div class="status-copy">
            <strong id="status-title">准备加载场景</strong>
            <span id="status-detail">正在连接 PlayCanvas GSplat 运行时</span>
          </div>
        </div>

        <div class="panel stats">
          <div class="stat-row"><span>当前版本</span><strong id="variant-kind">${defaultVariant.kind}</strong></div>
          <div class="stat-row"><span>交付格式</span><strong>${data.scene.format}</strong></div>
          <div class="stat-row"><span>文件体积</span><strong id="variant-size">${defaultVariant.size}</strong></div>
          <div class="stat-row"><span>高斯数量</span><strong id="variant-splats">${defaultVariant.splats}</strong></div>
          <div class="stat-row"><span>保留比例</span><strong id="variant-retention">${defaultVariant.retention}</strong></div>
          <div class="stat-row"><span>包围尺寸</span><strong>${data.scene.bounds}</strong></div>
        </div>

        <div class="panel section-panel ghost">
          <p class="section-title">当前判断</p>
          <h3 class="memory-title" id="variant-title">${defaultVariant.name}</h3>
          <p class="memory-body" id="variant-note">${defaultVariant.note}</p>
          <div class="loading-bar" id="loading-bar" aria-hidden="true"></div>
        </div>
      </section>

      <div></div>

      <aside class="detail">
        <div class="stack">
          <section class="panel section-panel">
            <p class="section-title">模型版本</p>
            <div class="variant-list" id="variant-list"></div>
          </section>

          <section class="panel section-panel">
            <p class="section-title">导览镜头</p>
            <div class="preset-list" id="preset-list"></div>
          </section>

          <section class="panel section-panel">
            <p class="section-title">MVP 取舍</p>
            <ol class="thesis-list" id="thesis-list"></ol>
          </section>

          <section class="panel section-panel">
            <p class="section-title">界面玻璃感</p>
            <div class="blur-list" id="blur-list"></div>
            <p class="footnote" id="blur-footnote"></p>
          </section>

          <section class="panel section-panel">
            <p class="section-title">渲染清晰度</p>
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
          </section>
        </div>

        <div class="stack">
          <section class="panel section-panel">
            <p class="section-title">记忆锚点</p>
            <div class="highlight-list" id="highlight-list"></div>
          </section>

          <section class="panel section-panel">
            <p class="section-title">当前聚焦</p>
            <h3 class="memory-title" id="memory-title">${firstHighlight.title}</h3>
            <p class="memory-body" id="memory-body">${firstHighlight.body}</p>
            <p class="footnote" id="memory-footnote">关联镜头：${firstPreset.name}</p>
          </section>
        </div>
      </aside>
    </div>
  </main>
`;

const sceneContainer = document.querySelector('#scene');
const variantList = document.querySelector('#variant-list');
const presetList = document.querySelector('#preset-list');
const highlightList = document.querySelector('#highlight-list');
const thesisList = document.querySelector('#thesis-list');
const blurList = document.querySelector('#blur-list');
const renderScaleSlider = document.querySelector('#render-scale-slider');
const statusTitle = document.querySelector('#status-title');
const statusDetail = document.querySelector('#status-detail');
const loadingBar = document.querySelector('#loading-bar');
const variantKind = document.querySelector('#variant-kind');
const variantSize = document.querySelector('#variant-size');
const variantSplats = document.querySelector('#variant-splats');
const variantRetention = document.querySelector('#variant-retention');
const variantTitle = document.querySelector('#variant-title');
const variantNote = document.querySelector('#variant-note');
const memoryTitle = document.querySelector('#memory-title');
const memoryBody = document.querySelector('#memory-body');
const memoryFootnote = document.querySelector('#memory-footnote');
const blurFootnote = document.querySelector('#blur-footnote');
const renderScaleValue = document.querySelector('#render-scale-value');
const renderScaleNote = document.querySelector('#render-scale-note');
const focusSceneButton = document.querySelector('#focus-scene');
const focusOverviewButton = document.querySelector('#focus-overview');

if (
  !sceneContainer ||
  !variantList ||
  !presetList ||
  !highlightList ||
  !thesisList ||
  !blurList ||
  !renderScaleSlider ||
  !statusTitle ||
  !statusDetail ||
  !loadingBar ||
  !variantKind ||
  !variantSize ||
  !variantSplats ||
  !variantRetention ||
  !variantTitle ||
  !variantNote ||
  !memoryTitle ||
  !memoryBody ||
  !memoryFootnote ||
  !blurFootnote ||
  !renderScaleValue ||
  !renderScaleNote ||
  !focusSceneButton ||
  !focusOverviewButton
) {
  throw new Error('Failed to initialize UI shell');
}

for (const line of data.interactionThesis) {
  const item = document.createElement('li');
  item.textContent = line;
  thesisList.append(item);
}

let runtime = null;
let activePresetId = firstPreset.id;
let activeHighlightId = firstHighlight.id;
let activeVariantId = defaultVariant.id;
let currentLoadToken = 0;

const variantButtons = new Map();
const presetButtons = new Map();
const highlightButtons = new Map();
const blurButtons = new Map();

for (const preset of blurPresets) {
  const button = document.createElement('button');
  button.className = 'blur-option';
  button.type = 'button';
  button.innerHTML = `<strong>${preset.name}</strong><span>${preset.summary}</span>`;
  button.addEventListener('click', () => {
    activateBlurPreset(preset.id);
  });
  blurButtons.set(preset.id, button);
  blurList.append(button);
}

for (const variant of data.variants) {
  const button = document.createElement('button');
  button.className = 'variant';
  button.type = 'button';
  button.innerHTML = `
    <strong>${variant.name}</strong>
    <span>${variant.summary}</span>
    <small>${variant.size} · ${variant.retention} · ${variant.kind}</small>
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

for (const highlight of data.highlights) {
  const button = document.createElement('button');
  button.className = 'highlight';
  button.type = 'button';
  button.innerHTML = `<strong>${highlight.name}</strong><span>${highlight.title}</span>`;
  button.addEventListener('click', () => {
    activateHighlight(highlight.id, true);
  });
  highlightButtons.set(highlight.id, button);
  highlightList.append(button);
}

focusSceneButton.addEventListener('click', () => activatePreset(firstPreset.id));
focusOverviewButton.addEventListener('click', () => activatePreset('hover'));
renderScaleSlider.addEventListener('input', (event) => {
  const nextPercent = Number(event.currentTarget.value);
  activateRenderScale(nextPercent);
});

updatePresetButtons();
updateHighlightButtons();
updateVariantButtons();
updateBlurButtons();
renderVariantMeta(defaultVariant);
renderBlurMeta(getBlurPreset(activeBlurPresetId));
renderRenderScaleMeta(activeRenderScalePercent);

statusTitle.textContent = '加载中';
statusDetail.textContent = '准备解析 SOG 资产与切换逻辑';

await activateVariant(defaultVariant.id, true);

function renderVariantMeta(variant) {
  variantKind.textContent = variant.kind;
  variantSize.textContent = variant.size;
  variantSplats.textContent = variant.splats;
  variantRetention.textContent = variant.retention;
  variantTitle.textContent = variant.name;
  variantNote.textContent = variant.note;
}

function renderBlurMeta(preset) {
  blurFootnote.textContent = `当前：${preset.name} · 静止 ${preset.blur}px / 交互 ${preset.interactingBlur}px`;
}

function activateBlurPreset(presetId) {
  const preset = getBlurPreset(presetId);
  activeBlurPresetId = preset.id;
  applyBlurPreset(preset);
  persistBlurPresetId(preset.id);
  updateBlurButtons();
  renderBlurMeta(preset);
}

function activateRenderScale(nextPercent) {
  const normalizedPercent = normalizeRenderScalePercent(nextPercent);
  activeRenderScalePercent = normalizedPercent;
  renderScaleSlider.value = String(normalizedPercent);
  persistRenderScalePercent(normalizedPercent);
  renderRenderScaleMeta(normalizedPercent);
  applyRenderScaleToRuntime(runtime, normalizedPercent);
}

function renderRenderScaleMeta(percent) {
  const pixelRatio = (percent / 100).toFixed(2);
  renderScaleValue.textContent = `${percent}% · x${pixelRatio}`;
  renderScaleNote.textContent = percent >= 100
    ? '更清晰，关闭自动降分辨率。'
    : '更偏性能，锁定当前渲染比例。';
}

async function activateVariant(variantId, initial = false) {
  const variant = variantsById.get(variantId);

  if (!variant) {
    return;
  }

  if (!initial && variantId === activeVariantId) {
    return;
  }

  const loadToken = ++currentLoadToken;
  activeVariantId = variant.id;
  updateVariantButtons();
  renderVariantMeta(variant);
  setVariantButtonsDisabled(true);
  loadingBar.style.opacity = '1';
  statusTitle.textContent = '正在切换模型';
  statusDetail.textContent = `加载 ${variant.name}：${variant.summary}`;

  try {
    const nextRuntime = await mountRuntime(variant);
    if (loadToken !== currentLoadToken) {
      nextRuntime?.app?.destroy();
      return;
    }

    runtime = nextRuntime;
    activatePreset(activePresetId || 'hover', true);
    statusTitle.textContent = '场景已就绪';
    statusDetail.textContent = `当前版本：${variant.name} · ${variant.size} · ${variant.retention}`;
  } catch (error) {
    statusTitle.textContent = '加载失败';
    statusDetail.textContent = error instanceof Error ? error.message : '未知错误';
    throw error;
  } finally {
    if (loadToken === currentLoadToken) {
      loadingBar.style.opacity = '0';
      setVariantButtonsDisabled(false);
    }
  }
}

async function mountRuntime(variant) {
  if (runtime) {
    runtime.app.destroy();
    runtime = null;
  }

  sceneContainer.replaceChildren();
  const canvas = document.createElement('canvas');
  sceneContainer.append(canvas);
  return createRuntime(canvas, variant);
}

function activatePreset(presetId, immediate = false) {
  const preset = data.presets.find((entry) => entry.id === presetId);

  if (!preset) {
    return;
  }

  activePresetId = preset.id;
  updatePresetButtons();

  if (runtime) {
    moveCamera(runtime, preset, immediate);
  }

  const relatedHighlight = data.highlights.find((entry) => entry.presetId === preset.id);
  if (relatedHighlight) {
    activateHighlight(relatedHighlight.id, false);
  }
}

function activateHighlight(highlightId, syncPreset) {
  const highlight = data.highlights.find((entry) => entry.id === highlightId);

  if (!highlight) {
    return;
  }

  activeHighlightId = highlight.id;
  memoryTitle.textContent = highlight.title;
  memoryBody.textContent = highlight.body;

  const linkedPreset = data.presets.find((entry) => entry.id === highlight.presetId);
  memoryFootnote.textContent = linkedPreset ? `关联镜头：${linkedPreset.name}` : '关联镜头：未设置';

  updateHighlightButtons();

  if (syncPreset && linkedPreset) {
    activatePreset(linkedPreset.id);
  }
}

function updatePresetButtons() {
  for (const [presetId, button] of presetButtons) {
    button.classList.toggle('is-active', presetId === activePresetId);
  }
}

function updateHighlightButtons() {
  for (const [highlightId, button] of highlightButtons) {
    button.classList.toggle('is-active', highlightId === activeHighlightId);
  }
}

function updateVariantButtons() {
  for (const [variantId, button] of variantButtons) {
    button.classList.toggle('is-active', variantId === activeVariantId);
  }
}

function updateBlurButtons() {
  for (const [presetId, button] of blurButtons) {
    button.classList.toggle('is-active', presetId === activeBlurPresetId);
  }
}

function setVariantButtonsDisabled(disabled) {
  for (const button of variantButtons.values()) {
    button.disabled = disabled;
  }
}

async function createRuntime(canvasElement, variant) {
  const app = new pc.Application(canvasElement, {
    mouse: new pc.Mouse(canvasElement),
    touch: new pc.TouchDevice(canvasElement)
  });

  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  const performanceMode = createPerformanceMode(window, activeRenderScalePercent);
  app.graphicsDevice.maxPixelRatio = performanceMode.currentPixelRatio;
  app.scene.gammaCorrection = pc.GAMMA_SRGB;
  app.scene.toneMapping = pc.TONEMAP_ACES;
  app.scene.skyboxIntensity = 0.65;
  app.start();

  canvasElement.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('resize', () => app.resizeCanvas());

  const splatAsset = new pc.Asset(`ruoshui-${variant.id}`, 'gsplat', { url: variant.assetUrl });

  await new Promise((resolve, reject) => {
    const loader = new pc.AssetListLoader([splatAsset], app.assets);
    const onError = (err, asset) => {
      app.assets.off('error', onError);
      reject(new Error(`加载 ${asset.name} 失败：${String(err)}`));
    };

    app.assets.on('error', onError);
    loader.load(() => {
      app.assets.off('error', onError);
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
  splat.addComponent('gsplat', {
    asset: splatAsset
  });
  app.root.addChild(splat);

  const runtimeState = {
    app,
    orbit,
    performanceMode
  };

  app.on('update', (dt) => {
    updateOrbitController(runtimeState.orbit, dt);
    updatePerformanceMode(runtimeState.performanceMode, app, dt);
  });

  return runtimeState;
}

function moveCamera(runtimeState, preset, immediate = false) {
  setOrbitPreset(runtimeState.orbit, vec3(preset.position), vec3(preset.target), immediate);
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
    transition: null
  };

  const beginPointer = (event) => {
    orbit.pointerMode = event.button === 2 ? 'pan' : 'rotate';
    document.body.classList.add('is-interacting');
    if (performanceMode) {
      performanceMode.isInteracting = true;
    }
    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;
  };

  const endPointer = () => {
    orbit.pointerMode = null;
    document.body.classList.remove('is-interacting');
    if (performanceMode) {
      performanceMode.isInteracting = false;
    }
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
    const right = camera.right.clone().mulScalar(-dx * orbit.panSpeed * distanceFactor);
    const up = camera.up.clone().mulScalar(dy * orbit.panSpeed * distanceFactor);
    orbit.transition = null;
    orbit.desiredTarget.add(right).add(up);
  };

  const onWheel = (event) => {
    event.preventDefault();
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

  applyOrbit(orbit, 1);
  return orbit;
}

function setOrbitPreset(orbit, position, target, immediate) {
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
    duration: 1.35,
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

  applyOrbit(orbit, orbit.damping);
}

function applyOrbit(orbit, damping) {
  const blend = damping >= 1 ? 1 : 1 - Math.pow(1 - damping, 2);
  orbit.currentTarget.lerp(orbit.currentTarget, orbit.desiredTarget, blend);
  orbit.currentYaw = lerpAngle(orbit.currentYaw, orbit.desiredYaw, blend);
  orbit.currentPitch = lerp(orbit.currentPitch, orbit.desiredPitch, blend);
  orbit.currentDistance = lerp(orbit.currentDistance, orbit.desiredDistance, blend);

  const position = orbitToPosition(orbit.currentTarget, orbit.currentYaw, orbit.currentPitch, orbit.currentDistance);
  orbit.camera.setPosition(position);
  orbit.camera.lookAt(orbit.currentTarget);
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

function orbitToPosition(target, yaw, pitch, distance) {
  const cosPitch = Math.cos(pitch);
  return new pc.Vec3(
    target.x + Math.sin(yaw) * cosPitch * distance,
    target.y + Math.sin(pitch) * distance,
    target.z + Math.cos(yaw) * cosPitch * distance
  );
}

function easeInOutCubic(value) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function degToRad(value) {
  return (value * Math.PI) / 180;
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
    return;
  }

  performanceMode.sampleTime += dt;
  performanceMode.frameCount += 1;
  performanceMode.cooldown = Math.max(0, performanceMode.cooldown - dt);

  if (performanceMode.sampleTime < 1.25 || performanceMode.cooldown > 0) {
    return;
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
  }

  performanceMode.sampleTime = 0;
  performanceMode.frameCount = 0;
}

function lerpAngle(from, to, alpha) {
  const turn = Math.PI * 2;
  const delta = ((((to - from) % turn) + turn + Math.PI) % turn) - Math.PI;
  return from + delta * alpha;
}

function getBlurPreset(presetId) {
  return blurPresets.find((preset) => preset.id === presetId) ?? blurPresets[2];
}

function getInitialBlurPresetId() {
  try {
    const savedPresetId = window.localStorage.getItem(blurPresetStorageKey);
    if (savedPresetId && blurPresets.some((preset) => preset.id === savedPresetId)) {
      return savedPresetId;
    }
  } catch {
    return 'medium';
  }

  return 'medium';
}

function persistBlurPresetId(presetId) {
  try {
    window.localStorage.setItem(blurPresetStorageKey, presetId);
  } catch {
    return;
  }
}

function applyBlurPreset(preset) {
  document.documentElement.style.setProperty('--panel-blur', `${preset.blur}px`);
  document.documentElement.style.setProperty('--panel-blur-interacting', `${preset.interactingBlur}px`);
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
}
