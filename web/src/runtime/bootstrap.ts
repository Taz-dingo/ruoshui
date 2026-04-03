import { createPerformanceMode } from '../performance/render-scale';
import { createLoopController } from './lifecycle';

interface CreateRuntimeAppArgs {
  pc: any;
  canvasElement: HTMLCanvasElement;
  graphicsBackendPreference: GraphicsBackendPreference;
  runtimeWindow: Window;
  renderScalePercent: number;
  gpuDiagnostics?: GraphicsBackendDiagnostics | null;
}

type GraphicsBackendPreference = 'auto' | 'webgl2' | 'webgpu';

interface GraphicsBackendDiagnostics {
  navigatorGpuAvailable: boolean;
  adapterName: string | null;
  preferredBackends: string[];
}

interface BindRuntimeViewportArgs {
  app: any;
  canvasElement: HTMLCanvasElement;
  loopController: ReturnType<typeof createLoopController>;
  runtimeWindow: Window;
}

interface RuntimeLifecycleState {
  renderWakeRemaining: number;
  orbit: {
    cancelInteraction?: (() => void) | null;
  };
  requestRender: () => void;
}

interface BindRuntimeVisibilityArgs {
  app: any;
  canvasElement: HTMLCanvasElement;
  loopController: ReturnType<typeof createLoopController>;
  runtimeDocument: Document;
  runtimeWindow: Window;
  runtimeState: RuntimeLifecycleState;
  onResume?: (() => void) | null;
}

async function createRuntimeApp({
  pc,
  canvasElement,
  graphicsBackendPreference,
  runtimeWindow,
  renderScalePercent,
  gpuDiagnostics = null
}: CreateRuntimeAppArgs) {
  const deviceTypes = resolvePreferredDeviceTypes(
    pc,
    runtimeWindow,
    graphicsBackendPreference
  );
  const graphicsDeviceOptions = {
    alpha: false,
    antialias: false,
    powerPreference: 'high-performance',
    deviceTypes
  };
  const graphicsDevice = await createPreferredGraphicsDevice(
    pc,
    canvasElement,
    graphicsDeviceOptions
  );
  const app = new pc.Application(canvasElement, {
    mouse: new pc.Mouse(canvasElement),
    touch: new pc.TouchDevice(canvasElement),
    graphicsDevice,
    graphicsDeviceOptions
  });

  const performanceMode = createPerformanceMode(runtimeWindow, renderScalePercent);
  const loopController = createLoopController(app);
  app.graphicsDevice.maxPixelRatio = performanceMode.currentPixelRatio;
  app.scene.gammaCorrection = pc.GAMMA_SRGB;
  app.scene.toneMapping = pc.TONEMAP_ACES;
  app.scene.skyboxIntensity = 0.65;
  app.start();
  app.autoRender = true;
  app.renderNextFrame = true;

  return {
    app,
    graphicsBackend: formatGraphicsBackend(app.graphicsDevice),
    gpuDiagnostics,
    performanceMode,
    loopController
  };
}

async function createPreferredGraphicsDevice(
  pc: any,
  canvasElement: HTMLCanvasElement,
  options: Record<string, unknown>
) {
  if (typeof pc.createGraphicsDevice === 'function') {
    return pc.createGraphicsDevice(canvasElement, options);
  }

  return null;
}

async function collectGraphicsBackendDiagnostics(pc: any, runtimeWindow: Window): Promise<GraphicsBackendDiagnostics> {
  const navigatorWithGpu = runtimeWindow.navigator as Navigator & {
    gpu?: {
      requestAdapter?: () => Promise<any>;
    };
  };
  const navigatorGpuAvailable = Boolean(navigatorWithGpu.gpu);
  const preferredBackends = resolvePreferredDeviceTypes(pc, runtimeWindow, 'auto').map((deviceType) =>
    String(deviceType)
  );
  let adapterName: string | null = null;

  if (navigatorGpuAvailable) {
    try {
      const adapter = await navigatorWithGpu.gpu?.requestAdapter?.();
      adapterName = adapter?.info?.description ?? adapter?.info?.vendor ?? 'Adapter 可用';
    } catch {
      adapterName = 'Adapter 请求失败';
    }
  }

  return {
    navigatorGpuAvailable,
    adapterName,
    preferredBackends
  };
}

const graphicsBackendPreferenceStorageKey = 'ruoshui-graphics-backend-v2';

function normalizeGraphicsBackendPreference(
  value: string | null | undefined
): GraphicsBackendPreference {
  if (value === 'webgl2' || value === 'webgpu') {
    return value;
  }

  return 'webgl2';
}

function loadGraphicsBackendPreference(runtimeWindow: Window): GraphicsBackendPreference {
  try {
    return normalizeGraphicsBackendPreference(
      runtimeWindow.localStorage.getItem(graphicsBackendPreferenceStorageKey)
    );
  } catch {
    return 'webgl2';
  }
}

function persistGraphicsBackendPreference(
  runtimeWindow: Window,
  preference: GraphicsBackendPreference
) {
  try {
    runtimeWindow.localStorage.setItem(
      graphicsBackendPreferenceStorageKey,
      preference
    );
  } catch {
    return;
  }
}

function resolvePreferredDeviceTypes(
  pc: any,
  runtimeWindow: Window,
  preference: GraphicsBackendPreference
) {
  const deviceTypes = [];
  const hasNavigatorGpu = 'gpu' in runtimeWindow.navigator;

  if (preference !== 'webgl2' && hasNavigatorGpu && pc.DEVICETYPE_WEBGPU) {
    deviceTypes.push(pc.DEVICETYPE_WEBGPU);
  }

  if (preference !== 'webgpu' && pc.DEVICETYPE_WEBGL2) {
    deviceTypes.push(pc.DEVICETYPE_WEBGL2);
  }

  return deviceTypes;
}

function formatGraphicsBackend(graphicsDevice: any) {
  if (!graphicsDevice) {
    return '未知';
  }

  if (graphicsDevice.isWebGPU || graphicsDevice.deviceType === 'webgpu') {
    return 'WebGPU';
  }

  if (graphicsDevice.isWebGL2 || graphicsDevice.deviceType === 'webgl2') {
    return 'WebGL2';
  }

  return String(graphicsDevice.deviceType ?? '未知');
}

function bindRuntimeViewport({
  app,
  canvasElement,
  loopController,
  runtimeWindow
}: BindRuntimeViewportArgs) {
  const preventContextMenu = (event: Event) => event.preventDefault();
  const handleResize = () => {
    syncRuntimeCanvasResolution(app, canvasElement, runtimeWindow);
    loopController.wake();
    app.renderNextFrame = true;
  };

  canvasElement.addEventListener('contextmenu', preventContextMenu);
  runtimeWindow.addEventListener('resize', handleResize);
  const resizeObserver =
    typeof ResizeObserver !== 'undefined' && canvasElement.parentElement
      ? new ResizeObserver(() => {
          handleResize();
        })
      : null;
  resizeObserver?.observe(canvasElement.parentElement);
  handleResize();
  runtimeWindow.requestAnimationFrame(() => {
    handleResize();
  });

  return {
    destroy() {
      runtimeWindow.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      canvasElement.removeEventListener('contextmenu', preventContextMenu);
    }
  };
}

function bindRuntimeVisibility({
  app,
  canvasElement,
  loopController,
  runtimeDocument,
  runtimeWindow,
  runtimeState,
  onResume = null
}: BindRuntimeVisibilityArgs) {
  const suspendRuntime = () => {
    runtimeState.renderWakeRemaining = 0;
    runtimeState.orbit.cancelInteraction?.();
    app.autoRender = false;
    app.renderNextFrame = false;
    loopController.sleep();
  };

  const resumeRuntime = () => {
    syncRuntimeCanvasResolution(app, canvasElement, runtimeWindow);
    runtimeState.requestRender();
    onResume?.();
  };

  const handleVisibilityChange = () => {
    if (runtimeDocument.hidden) {
      suspendRuntime();
      return;
    }

    resumeRuntime();
  };

  const handleWindowBlur = () => {
    runtimeState.orbit.cancelInteraction?.();
  };

  const handleWindowFocus = () => {
    if (!runtimeDocument.hidden) {
      resumeRuntime();
    }
  };

  runtimeDocument.addEventListener('visibilitychange', handleVisibilityChange);
  runtimeWindow.addEventListener('blur', handleWindowBlur);
  runtimeWindow.addEventListener('focus', handleWindowFocus);

  return {
    destroy() {
      runtimeDocument.removeEventListener('visibilitychange', handleVisibilityChange);
      runtimeWindow.removeEventListener('blur', handleWindowBlur);
      runtimeWindow.removeEventListener('focus', handleWindowFocus);
    }
  };
}

function syncRuntimeCanvasResolution(
  app: any,
  canvasElement: HTMLCanvasElement,
  runtimeWindow: Window
) {
  const host = canvasElement.parentElement;
  const rect = host?.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect?.width || runtimeWindow.innerWidth || 1));
  const height = Math.max(1, Math.round(rect?.height || runtimeWindow.innerHeight || 1));
  const deviceRatio = Math.min(
    app.graphicsDevice.maxPixelRatio || 1,
    runtimeWindow.devicePixelRatio || 1
  );

  canvasElement.style.width = `${width}px`;
  canvasElement.style.height = `${height}px`;
  app.graphicsDevice.setResolution(
    Math.max(1, Math.floor(width * deviceRatio)),
    Math.max(1, Math.floor(height * deviceRatio))
  );
}

export {
  bindRuntimeViewport,
  bindRuntimeVisibility,
  collectGraphicsBackendDiagnostics,
  createRuntimeApp,
  formatGraphicsBackend,
  loadGraphicsBackendPreference,
  normalizeGraphicsBackendPreference,
  persistGraphicsBackendPreference
};

export type {
  GraphicsBackendPreference
};
