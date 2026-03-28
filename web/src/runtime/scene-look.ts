interface SceneLookSettings {
  brightnessPercent: number;
  contrastPercent: number;
  saturationPercent: number;
}

interface RuntimeSceneLookLike {
  app?: {
    scene?: {
      skyboxIntensity?: number;
    };
  } | null;
  canvasElement?: HTMLCanvasElement | null;
  requestRender?: (() => void) | null;
  sceneLook?: SceneLookSettings;
}

const baseSceneSkyboxIntensity = 0.65;
const sceneLookStorageKey = 'ruoshui-scene-look-v2';
const defaultSceneLookSettings: SceneLookSettings = {
  brightnessPercent: 105,
  contrastPercent: 120,
  saturationPercent: 115
};

function clampPercent(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) {
    return minimum;
  }

  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function normalizeSceneLookSettings(
  settings: Partial<SceneLookSettings> | null | undefined
): SceneLookSettings {
  return {
    brightnessPercent: clampPercent(settings?.brightnessPercent ?? defaultSceneLookSettings.brightnessPercent, 80, 140),
    contrastPercent: clampPercent(settings?.contrastPercent ?? defaultSceneLookSettings.contrastPercent, 80, 130),
    saturationPercent: clampPercent(settings?.saturationPercent ?? defaultSceneLookSettings.saturationPercent, 70, 140)
  };
}

function buildSceneCanvasFilter(settings: SceneLookSettings) {
  return `brightness(${settings.brightnessPercent}%) contrast(${settings.contrastPercent}%) saturate(${settings.saturationPercent}%)`;
}

function formatSceneLookSummary(settings: SceneLookSettings) {
  return `亮 ${settings.brightnessPercent}% · 对 ${settings.contrastPercent}% · 饱 ${settings.saturationPercent}%`;
}

function loadSceneLookSettings(runtimeWindow: Window) {
  const storedValue = runtimeWindow.localStorage.getItem(sceneLookStorageKey);
  if (!storedValue) {
    return defaultSceneLookSettings;
  }

  try {
    return normalizeSceneLookSettings(JSON.parse(storedValue));
  } catch {
    return defaultSceneLookSettings;
  }
}

function persistSceneLookSettings(runtimeWindow: Window, settings: SceneLookSettings) {
  runtimeWindow.localStorage.setItem(sceneLookStorageKey, JSON.stringify(settings));
}

function applyRuntimeSceneLook(runtimeState: RuntimeSceneLookLike | null | undefined, settings: SceneLookSettings) {
  if (!runtimeState) {
    return;
  }

  const normalizedSettings = normalizeSceneLookSettings(settings);
  runtimeState.sceneLook = normalizedSettings;

  if (runtimeState.canvasElement) {
    runtimeState.canvasElement.style.filter = buildSceneCanvasFilter(normalizedSettings);
  }

  if (runtimeState.app?.scene) {
    runtimeState.app.scene.skyboxIntensity = baseSceneSkyboxIntensity * (normalizedSettings.brightnessPercent / 100);
  }

  runtimeState.requestRender?.();
}

export {
  applyRuntimeSceneLook,
  baseSceneSkyboxIntensity,
  buildSceneCanvasFilter,
  defaultSceneLookSettings,
  formatSceneLookSummary,
  loadSceneLookSettings,
  normalizeSceneLookSettings,
  persistSceneLookSettings
};
export type {
  SceneLookSettings
};
