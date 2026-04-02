import { createPerformanceMode } from '../performance/render-scale';
import { createLoopController } from './lifecycle';

interface CreateRuntimeAppArgs {
  pc: any;
  canvasElement: HTMLCanvasElement;
  runtimeWindow: Window;
  renderScalePercent: number;
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
  loopController: ReturnType<typeof createLoopController>;
  runtimeDocument: Document;
  runtimeWindow: Window;
  runtimeState: RuntimeLifecycleState;
  onResume?: (() => void) | null;
}

function createRuntimeApp({
  pc,
  canvasElement,
  runtimeWindow,
  renderScalePercent
}: CreateRuntimeAppArgs) {
  const deviceTypes = resolvePreferredDeviceTypes(pc, runtimeWindow);
  const app = new pc.Application(canvasElement, {
    mouse: new pc.Mouse(canvasElement),
    touch: new pc.TouchDevice(canvasElement),
    graphicsDeviceOptions: {
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
      deviceTypes
    }
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
    performanceMode,
    loopController
  };
}

function resolvePreferredDeviceTypes(pc: any, runtimeWindow: Window) {
  const deviceTypes = [];
  const hasNavigatorGpu = 'gpu' in runtimeWindow.navigator;

  if (hasNavigatorGpu && pc.DEVICETYPE_WEBGPU) {
    deviceTypes.push(pc.DEVICETYPE_WEBGPU);
  }

  if (pc.DEVICETYPE_WEBGL2) {
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
  const resolveCanvasBounds = () => {
    const host = canvasElement.parentElement;
    const rect = host?.getBoundingClientRect();

    return {
      width: Math.max(1, Math.round(rect?.width || runtimeWindow.innerWidth || 1)),
      height: Math.max(1, Math.round(rect?.height || runtimeWindow.innerHeight || 1))
    };
  };

  const handleResize = () => {
    const { width, height } = resolveCanvasBounds();
    const deviceRatio = Math.min(
      app.graphicsDevice.maxPixelRatio || 1,
      runtimeWindow.devicePixelRatio || 1
    );
    loopController.wake();
    canvasElement.style.width = `${width}px`;
    canvasElement.style.height = `${height}px`;
    app.graphicsDevice.setResolution(
      Math.max(1, Math.floor(width * deviceRatio)),
      Math.max(1, Math.floor(height * deviceRatio))
    );
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

export {
  bindRuntimeViewport,
  bindRuntimeVisibility,
  createRuntimeApp,
  formatGraphicsBackend
};
