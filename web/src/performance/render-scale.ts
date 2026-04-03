import { renderScaleMinPercent, renderScaleStorageKey } from '../config';
import type {
  PerformanceMode,
  RenderScaleAppLike,
  RenderScaleRuntimeLike
} from '../runtime/types';
import { clamp } from '../utils/math';

function createPerformanceMode(runtimeWindow: Window, lockedPercent: number): PerformanceMode {
  const supportedMaxPixelRatio = getMaxSupportedPixelRatio(runtimeWindow);
  const initialPixelRatio = normalizeRenderScalePercent(lockedPercent, supportedMaxPixelRatio) / 100;

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

function updatePerformanceMode(performanceMode: PerformanceMode, app: RenderScaleAppLike, dt: number): boolean {
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
    syncCanvasResolution(app);
    performanceMode.cooldown = 2.5;
    performanceMode.sampleTime = 0;
    performanceMode.frameCount = 0;
    return true;
  }

  performanceMode.sampleTime = 0;
  performanceMode.frameCount = 0;
  return false;
}

function getMaxSupportedPixelRatio(runtimeWindow: Window): number {
  const deviceRatio = Math.max(runtimeWindow.devicePixelRatio || 1, 1);
  return deviceRatio;
}

function normalizeRenderScalePercent(value: number, maxRenderScalePercent: number): number {
  const clamped = clamp(Number(value) || maxRenderScalePercent, renderScaleMinPercent, maxRenderScalePercent);
  return Math.round(clamped);
}

function getInitialRenderScalePercent(runtimeWindow: Window, maxRenderScalePercent: number): number {
  try {
    const savedPercent = runtimeWindow.localStorage.getItem(renderScaleStorageKey);
    if (savedPercent) {
      return normalizeRenderScalePercent(Number(savedPercent), maxRenderScalePercent);
    }
  } catch {
    return maxRenderScalePercent;
  }

  return maxRenderScalePercent;
}

function persistRenderScalePercent(runtimeWindow: Window, percent: number): void {
  try {
    runtimeWindow.localStorage.setItem(renderScaleStorageKey, String(percent));
  } catch {
    return;
  }
}

function applyRenderScaleToRuntime(
  runtimeState: RenderScaleRuntimeLike | null | undefined,
  percent: number,
  maxRenderScalePercent: number
): void {
  if (!runtimeState?.performanceMode || !runtimeState?.app) {
    return;
  }

  const nextRatio = normalizeRenderScalePercent(percent, maxRenderScalePercent) / 100;
  runtimeState.performanceMode.isLocked = true;
  runtimeState.performanceMode.lockedPixelRatio = nextRatio;
  runtimeState.performanceMode.currentPixelRatio = nextRatio;
  runtimeState.performanceMode.targetPixelRatio = nextRatio;
  runtimeState.performanceMode.maxPixelRatio = nextRatio;
  runtimeState.app.graphicsDevice.maxPixelRatio = nextRatio;
  syncCanvasResolution(runtimeState.app);
  runtimeState.requestRender?.();
}

export {
  applyRenderScaleToRuntime,
  createPerformanceMode,
  getInitialRenderScalePercent,
  getMaxSupportedPixelRatio,
  normalizeRenderScalePercent,
  persistRenderScalePercent,
  updatePerformanceMode
};

function syncCanvasResolution(app: RenderScaleAppLike): void {
  const canvas = app.graphicsDevice.canvas;

  if (!canvas || typeof app.graphicsDevice.setResolution !== 'function') {
    return;
  }

  const cssWidth = Math.max(1, Math.round(canvas.clientWidth || window.innerWidth || 1));
  const cssHeight = Math.max(1, Math.round(canvas.clientHeight || window.innerHeight || 1));
  const deviceRatio = Math.min(app.graphicsDevice.maxPixelRatio || 1, window.devicePixelRatio || 1);

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  app.graphicsDevice.setResolution(
    Math.max(1, Math.floor(cssWidth * deviceRatio)),
    Math.max(1, Math.floor(cssHeight * deviceRatio))
  );
}
