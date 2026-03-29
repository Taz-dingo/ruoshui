interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

interface PerformanceMode {
  targetPixelRatio: number;
  currentPixelRatio: number;
  lockedPixelRatio: number;
  supportedMaxPixelRatio: number;
  minPixelRatio: number;
  maxPixelRatio: number;
  sampleTime: number;
  frameCount: number;
  cooldown: number;
  isInteracting: boolean;
  isLocked: boolean;
}

interface RenderScaleAppLike {
  graphicsDevice: {
    maxPixelRatio: number;
    canvas?: HTMLCanvasElement | null;
    setResolution?: (width: number, height: number) => void;
  };
}

interface RenderScaleRuntimeLike {
  performanceMode?: PerformanceMode | null;
  app?: RenderScaleAppLike | null;
  requestRender?: (() => void) | null;
}

export type {
  PerformanceMode,
  RenderScaleAppLike,
  RenderScaleRuntimeLike,
  Vector3Like
};
