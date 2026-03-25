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

const firstPreset = data.presets[0];
const firstHighlight = data.highlights[0];

appElement.innerHTML = `
  <main class="shell">
    <div class="scene" id="scene"></div>
    <div class="hud">
      <section class="rail">
        <div class="panel hero">
          <p class="eyebrow">Ruoshui Square · Web MVP</p>
          <h1>${data.scene.title}</h1>
          <h2>${data.scene.subtitle}</h2>
          <p>${data.scene.summary}</p>
          <div class="hero-actions">
            <button class="button primary" id="focus-scene">进入场景</button>
            <button class="button secondary" id="focus-overview">切到全览</button>
          </div>
          <p class="microcopy">左键旋转 · 右键平移 · 滚轮缩放 · 当前先聚焦桌面端</p>
        </div>

        <div class="panel status-strip" aria-live="polite">
          <span class="status-dot"></span>
          <div class="status-copy">
            <strong id="status-title">准备加载场景</strong>
            <span id="status-detail">正在连接 PlayCanvas GSplat 运行时</span>
          </div>
        </div>

        <div class="panel stats">
          <div class="stat-row"><span>交付格式</span><strong>${data.scene.format}</strong></div>
          <div class="stat-row"><span>文件体积</span><strong>${data.scene.size}</strong></div>
          <div class="stat-row"><span>高斯数量</span><strong>${data.scene.splats}</strong></div>
          <div class="stat-row"><span>包围尺寸</span><strong>${data.scene.bounds}</strong></div>
        </div>

        <div class="panel section-panel ghost">
          <p class="section-title">视觉主张</p>
          <p class="memory-body">${data.visualThesis}</p>
          <div class="loading-bar" id="loading-bar" aria-hidden="true"></div>
        </div>
      </section>

      <div></div>

      <aside class="detail">
        <div class="stack">
          <section class="panel section-panel">
            <p class="section-title">导览镜头</p>
            <div class="preset-list" id="preset-list"></div>
          </section>

          <section class="panel section-panel">
            <p class="section-title">MVP 取舍</p>
            <ol class="thesis-list" id="thesis-list"></ol>
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
const presetList = document.querySelector('#preset-list');
const highlightList = document.querySelector('#highlight-list');
const thesisList = document.querySelector('#thesis-list');
const statusTitle = document.querySelector('#status-title');
const statusDetail = document.querySelector('#status-detail');
const loadingBar = document.querySelector('#loading-bar');
const memoryTitle = document.querySelector('#memory-title');
const memoryBody = document.querySelector('#memory-body');
const memoryFootnote = document.querySelector('#memory-footnote');
const focusSceneButton = document.querySelector('#focus-scene');
const focusOverviewButton = document.querySelector('#focus-overview');

if (
  !sceneContainer ||
  !presetList ||
  !highlightList ||
  !thesisList ||
  !statusTitle ||
  !statusDetail ||
  !loadingBar ||
  !memoryTitle ||
  !memoryBody ||
  !memoryFootnote ||
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

const presetButtons = new Map();
const highlightButtons = new Map();

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

updatePresetButtons();
updateHighlightButtons();

const canvas = document.createElement('canvas');
sceneContainer.append(canvas);

statusTitle.textContent = '加载中';
statusDetail.textContent = '准备解析 SOG 资产与交互逻辑';

try {
  runtime = await createRuntime(canvas, data);
  loadingBar.style.opacity = '0';
  statusTitle.textContent = '场景已就绪';
  statusDetail.textContent = '可以开始导览与镜头切换';
  activatePreset('hover', true);
} catch (error) {
  loadingBar.style.opacity = '0';
  statusTitle.textContent = '加载失败';
  statusDetail.textContent = error instanceof Error ? error.message : '未知错误';
  throw error;
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

async function createRuntime(canvasElement, config) {
  const app = new pc.Application(canvasElement, {
    mouse: new pc.Mouse(canvasElement),
    touch: new pc.TouchDevice(canvasElement)
  });

  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio, 1.5);
  app.scene.gammaCorrection = pc.GAMMA_SRGB;
  app.scene.toneMapping = pc.TONEMAP_ACES;
  app.scene.skyboxIntensity = 0.65;
  app.start();

  canvasElement.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('resize', () => app.resizeCanvas());

  const splatAsset = new pc.Asset('ruoshui-hhuc', 'gsplat', { url: config.scene.assetUrl });

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

  statusTitle.textContent = '正在创建场景';
  statusDetail.textContent = '高斯纹理已到位，开始挂载 gsplat 与本地轨道控制';

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
  const orbit = createOrbitController(camera, canvasElement, initialPosition, initialTarget);

  const splat = new pc.Entity('RuoshuiCampus');
  splat.addComponent('gsplat', {
    asset: splatAsset
  });
  app.root.addChild(splat);

  const runtimeState = {
    app,
    orbit
  };

  app.on('update', (dt) => {
    updateOrbitController(runtimeState.orbit, dt);
  });

  return runtimeState;
}

function moveCamera(runtimeState, preset, immediate = false) {
  setOrbitPreset(runtimeState.orbit, vec3(preset.position), vec3(preset.target), immediate);
}

function vec3(tuple) {
  return new pc.Vec3(tuple[0], tuple[1], tuple[2]);
}

function createOrbitController(camera, canvasElement, initialPosition, initialTarget) {
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
    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;
  };

  const endPointer = () => {
    orbit.pointerMode = null;
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

function lerpAngle(from, to, alpha) {
  const turn = Math.PI * 2;
  const delta = ((((to - from) % turn) + turn + Math.PI) % turn) - Math.PI;
  return from + delta * alpha;
}
