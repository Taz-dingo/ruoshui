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
    cameraFrame: any;
    mode: 'none' | 'fxaa' | 'taa';
  } | null;
  requestRender?: (() => void) | null;
}

const postProcessingStorageKey = 'ruoshui-post-processing-v1';
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
  if (graphicsBackend === 'WebGL2') {
    return 'fxaa';
  }

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
  const backendMode = getAntiAliasBackendMode(graphicsBackend);
  if (backendMode === 'fxaa') {
    return 'WebGL2 · 后处理抗锯齿';
  }

  return '当前后端暂不支持';
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
  const backendMode = getAntiAliasBackendMode(runtimeState.graphicsBackend);
  const postProcessingState = ensureRuntimePostProcessingState(pc, runtimeState);
  const shouldEnable = normalizedSettings.fxaaEnabled && backendMode !== null;

  if (!shouldEnable) {
    disableTaa(postProcessingState);
    disableFxaa(runtimeState, postProcessingState);
    runtimeState.activePostProcessing = {
      ...normalizedSettings,
      fxaaEnabled: false
    };
    runtimeState.requestRender?.();
    return;
  }

  disableTaa(postProcessingState);
  const fxaaEnabled = enableFxaa(runtimeState, postProcessingState);
  runtimeState.activePostProcessing = {
    ...normalizedSettings,
    fxaaEnabled
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
  disableTaa(runtimeState.postProcessing);
  runtimeState.postProcessing = null;
}

function ensureRuntimePostProcessingState(pc: any, runtimeState: RuntimePostProcessingLike) {
  if (!runtimeState.postProcessing) {
    runtimeState.postProcessing = {
      effect: createFxaaEffect(pc, runtimeState.app),
      isInstalled: false,
      cameraFrame: null,
      mode: 'none'
    };
  }

  return runtimeState.postProcessing;
}

function enableFxaa(
  runtimeState: RuntimePostProcessingLike,
  postProcessingState: NonNullable<RuntimePostProcessingLike['postProcessing']>
) {
  const queue = runtimeState.camera?.camera?.postEffects;
  if (!queue || !postProcessingState.effect) {
    return false;
  }

  if (!postProcessingState.isInstalled) {
    queue.addEffect?.(postProcessingState.effect);
    postProcessingState.isInstalled = true;
  }
  postProcessingState.mode = 'fxaa';
  return true;
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

function enableTaa(
  pc: any,
  runtimeState: RuntimePostProcessingLike,
  postProcessingState: NonNullable<RuntimePostProcessingLike['postProcessing']>
) {
  if (typeof pc?.CameraFrame !== 'function') {
    return false;
  }

  try {
    if (!postProcessingState.cameraFrame) {
      postProcessingState.cameraFrame = new pc.CameraFrame(
        runtimeState.app,
        runtimeState.camera?.camera
      );
    }
  } catch {
    postProcessingState.cameraFrame = null;
    return false;
  }

  const cameraFrame = postProcessingState.cameraFrame;
  if (!cameraFrame?.rendering || !cameraFrame?.taa) {
    disableTaa(postProcessingState);
    return false;
  }
  cameraFrame.rendering.samples = 1;
  cameraFrame.rendering.toneMapping = pc.TONEMAP_ACES;
  cameraFrame.rendering.sharpness = 0.35;
  cameraFrame.taa.enabled = true;
  cameraFrame.enabled = true;
  cameraFrame.update();
  postProcessingState.mode = 'taa';
  return true;
}

function disableTaa(
  postProcessingState: NonNullable<RuntimePostProcessingLike['postProcessing']>
) {
  if (postProcessingState.cameraFrame) {
    postProcessingState.cameraFrame.destroy?.();
    postProcessingState.cameraFrame = null;
  }

  if (postProcessingState.mode === 'taa') {
    postProcessingState.mode = 'none';
  }
}

function createFxaaEffect(pc: any, app: any) {
  if (
    typeof pc?.PostEffect !== 'function' ||
    typeof pc?.drawFullscreenQuad !== 'function' ||
    typeof pc?.createShaderFromCode !== 'function'
  ) {
    return null;
  }

  const vertexShader = `
    attribute vec2 aPosition;
    varying vec2 vUv0;
    void main(void) {
      gl_Position = vec4(aPosition, 0.0, 1.0);
      vUv0 = aPosition * 0.5 + 0.5;
    }
  `;

  const fragmentShader = `
    precision highp float;
    varying vec2 vUv0;
    uniform sampler2D uColorBuffer;
    uniform vec2 uResolution;

    void main(void) {
      vec2 texel = 1.0 / max(uResolution, vec2(1.0));
      vec3 rgbNW = texture2D(uColorBuffer, vUv0 + vec2(-1.0, -1.0) * texel).rgb;
      vec3 rgbNE = texture2D(uColorBuffer, vUv0 + vec2(1.0, -1.0) * texel).rgb;
      vec3 rgbSW = texture2D(uColorBuffer, vUv0 + vec2(-1.0, 1.0) * texel).rgb;
      vec3 rgbSE = texture2D(uColorBuffer, vUv0 + vec2(1.0, 1.0) * texel).rgb;
      vec3 rgbM = texture2D(uColorBuffer, vUv0).rgb;

      vec3 luma = vec3(0.299, 0.587, 0.114);
      float lumaNW = dot(rgbNW, luma);
      float lumaNE = dot(rgbNE, luma);
      float lumaSW = dot(rgbSW, luma);
      float lumaSE = dot(rgbSE, luma);
      float lumaM = dot(rgbM, luma);

      float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
      float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

      vec2 dir;
      dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
      dir.y = ((lumaNW + lumaSW) - (lumaNE + lumaSE));

      float dirReduce = max(
        (lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * 0.125),
        1.0 / 128.0
      );
      float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
      dir = clamp(dir * rcpDirMin, vec2(-8.0), vec2(8.0)) * texel;

      vec3 rgbA = 0.5 * (
        texture2D(uColorBuffer, vUv0 + dir * (1.0 / 3.0 - 0.5)).rgb +
        texture2D(uColorBuffer, vUv0 + dir * (2.0 / 3.0 - 0.5)).rgb
      );
      vec3 rgbB = rgbA * 0.5 + 0.25 * (
        texture2D(uColorBuffer, vUv0 + dir * -0.5).rgb +
        texture2D(uColorBuffer, vUv0 + dir * 0.5).rgb
      );

      float lumaB = dot(rgbB, luma);
      vec3 color = (lumaB < lumaMin || lumaB > lumaMax) ? rgbA : rgbB;
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const shader = pc.createShaderFromCode(
    app.graphicsDevice,
    vertexShader,
    fragmentShader,
    'RuoshuiFxaaEffect',
    {
      aPosition: pc.SEMANTIC_POSITION
    }
  );

  class FxaaEffect extends pc.PostEffect {
    shader: any;
    resolutionId: any;

    constructor(graphicsDevice: any) {
      super(graphicsDevice);
      this.shader = shader;
      this.resolutionId = graphicsDevice.scope.resolve('uResolution');
    }

    render(inputTarget: any, outputTarget: any, rect: any) {
      const width = inputTarget?.width ?? app.graphicsDevice.width ?? 1;
      const height = inputTarget?.height ?? app.graphicsDevice.height ?? 1;
      this.resolutionId.setValue([width, height]);
      pc.drawFullscreenQuad(this.device, outputTarget, this.vertexBuffer, this.shader, rect);
    }
  }

  return new FxaaEffect(app.graphicsDevice);
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
