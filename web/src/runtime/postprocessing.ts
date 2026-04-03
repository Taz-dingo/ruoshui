interface PostProcessingSettings {
  fxaaEnabled: boolean;
}

interface RuntimePostProcessingLike {
  app?: any;
  graphicsBackend?: string | null;
  activePostProcessing?: PostProcessingSettings;
  camera?: {
    camera?: {
      postEffects?: {
        addEffect?: (effect: any) => void;
        removeEffect?: (effect: any) => void;
      } | null;
    } | null;
  } | null;
  postProcessing?: {
    effect: any;
    isInstalled: boolean;
    mode: 'none' | 'fxaa';
  } | null;
  requestRender?: (() => void) | null;
}

const postProcessingStorageKey = 'ruoshui-post-processing-v2';
const defaultPostProcessingSettings: PostProcessingSettings = {
  fxaaEnabled: false
};

function normalizePostProcessingSettings(
  settings: Partial<PostProcessingSettings> | null | undefined
) {
  return {
    fxaaEnabled: Boolean(settings?.fxaaEnabled)
  };
}

function loadPostProcessingSettings(runtimeWindow: Window) {
  try {
    const storedValue = runtimeWindow.localStorage.getItem(postProcessingStorageKey);
    if (!storedValue) {
      return defaultPostProcessingSettings;
    }

    return normalizePostProcessingSettings(JSON.parse(storedValue));
  } catch {
    return defaultPostProcessingSettings;
  }
}

function persistPostProcessingSettings(
  runtimeWindow: Window,
  settings: PostProcessingSettings
) {
  try {
    runtimeWindow.localStorage.setItem(
      postProcessingStorageKey,
      JSON.stringify(normalizePostProcessingSettings(settings))
    );
  } catch {
    return;
  }
}

function getAntiAliasBackendMode(graphicsBackend: string | null | undefined) {
  return null;
}

function formatAntiAliasSummary(
  settings: PostProcessingSettings,
  graphicsBackend: string | null | undefined
) {
  if (!settings.fxaaEnabled) {
    return '关闭';
  }

  const backendMode = getAntiAliasBackendMode(graphicsBackend);
  if (backendMode === 'fxaa') {
    return 'FXAA';
  }

  return '关闭';
}

function isAntiAliasSupported(graphicsBackend: string | null | undefined) {
  return getAntiAliasBackendMode(graphicsBackend) !== null;
}

function getAntiAliasNote(graphicsBackend: string | null | undefined) {
  return '当前暂未开放';
}

function sanitizePostProcessingSettings(
  settings: Partial<PostProcessingSettings> | null | undefined,
  graphicsBackend: string | null | undefined
) {
  const normalizedSettings = normalizePostProcessingSettings(settings);
  if (isAntiAliasSupported(graphicsBackend)) {
    return normalizedSettings;
  }

  return {
    ...normalizedSettings,
    fxaaEnabled: false
  };
}

function applyRuntimePostProcessing(
  pc: any,
  runtimeState: RuntimePostProcessingLike | null | undefined,
  settings: PostProcessingSettings
) {
  if (!runtimeState?.app || !runtimeState?.camera?.camera) {
    return;
  }

  const normalizedSettings = sanitizePostProcessingSettings(
    settings,
    runtimeState.graphicsBackend
  );
  destroyRuntimePostProcessing(runtimeState);
  runtimeState.activePostProcessing = {
    ...normalizedSettings,
    fxaaEnabled: false
  };

  runtimeState.requestRender?.();
}

function destroyRuntimePostProcessing(
  runtimeState: RuntimePostProcessingLike | null | undefined
) {
  if (!runtimeState?.postProcessing) {
    return;
  }

  disableFxaa(runtimeState, runtimeState.postProcessing);
  runtimeState.postProcessing = null;
}

function disableFxaa(
  runtimeState: RuntimePostProcessingLike,
  postProcessingState: NonNullable<RuntimePostProcessingLike['postProcessing']>
) {
  if (postProcessingState.isInstalled) {
    runtimeState.camera?.camera?.postEffects?.removeEffect?.(postProcessingState.effect);
    postProcessingState.isInstalled = false;
  }

  if (postProcessingState.mode === 'fxaa') {
    postProcessingState.mode = 'none';
  }
}
export {
  applyRuntimePostProcessing,
  defaultPostProcessingSettings,
  destroyRuntimePostProcessing,
  formatAntiAliasSummary,
  getAntiAliasNote,
  getAntiAliasBackendMode,
  isAntiAliasSupported,
  loadPostProcessingSettings,
  normalizePostProcessingSettings,
  sanitizePostProcessingSettings,
  persistPostProcessingSettings
};

export type {
  PostProcessingSettings
};
