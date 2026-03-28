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

export function createRuntimeApp({
  pc,
  canvasElement,
  runtimeWindow,
  renderScalePercent
}: CreateRuntimeAppArgs) {
  const app = new pc.Application(canvasElement, {
    mouse: new pc.Mouse(canvasElement),
    touch: new pc.TouchDevice(canvasElement),
    graphicsDeviceOptions: {
      antialias: false,
      powerPreference: 'high-performance'
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
    performanceMode,
    loopController
  };
}

export function bindRuntimeViewport({
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

export function bindRuntimeVisibility({
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
