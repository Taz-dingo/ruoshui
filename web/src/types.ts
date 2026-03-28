export interface ViewerScene {
  title: string;
  subtitle: string;
  summary: string;
  format: string;
  bounds: string;
  defaultVariantId: string;
}

export interface UnifiedGsplatProfile {
  lodUnderfillLimit?: number;
  cooldownTicks?: number;
  lodUpdateDistance?: number;
  lodUpdateAngle?: number;
  lodBehindPenalty?: number;
}

export interface ViewerVariant {
  id: string;
  name: string;
  summary: string;
  assetUrl: string;
  size: string;
  splats: string;
  retention: string;
  kind: string;
  note: string;
  unified?: boolean;
  lodDistances?: number[];
  unifiedTuning?: UnifiedGsplatProfile;
}

export interface CameraPreset {
  id: string;
  name: string;
  summary: string;
  position: [number, number, number];
  target: [number, number, number];
}

export interface BenchmarkRouteStep {
  position: [number, number, number];
  target: [number, number, number];
  duration: number;
  hold: number;
}

export interface BenchmarkRoute {
  id: string;
  name: string;
  summary: string;
  steps: BenchmarkRouteStep[];
}

export interface ViewerHighlight {
  id: string;
  name: string;
  title: string;
  body: string;
  presetId: string;
}

export interface ViewerContent {
  scene: ViewerScene;
  variants: ViewerVariant[];
  visualThesis?: string;
  interactionThesis?: string[];
  presets: CameraPreset[];
  benchmarkRoutes?: BenchmarkRoute[];
  highlights?: ViewerHighlight[];
}

export interface LongTaskEntry {
  startMs: number;
  durationMs: number;
}

export interface ModelResourceEntry {
  name: string;
  startMs: number;
  durationMs: number;
  transferSize: number;
  encodedBodySize: number;
}

export interface LodWarmupEntry {
  elapsedMs: number | null;
  mode: string;
  pitch: number;
  distance: number | null;
  score: number | null;
}

export type FrameSample = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
];

export interface FrameStats {
  sampleCount: number;
  avgMs: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  peakMs: number | null;
}

export interface StepStats {
  stepIndex: number;
  label: string;
  avgMs: number | null;
  p95Ms: number | null;
  peakMs: number | null;
  sampleCount: number;
}

export interface StallCameraSnapshot {
  position: [number, number, number];
  target: [number, number, number];
  distance: number;
  pitch: number;
  yaw: number;
}

export interface StallWindow {
  startMs: number | null;
  endMs: number | null;
  durationMs: number | null;
  frameCount: number;
  avgMs: number | null;
  peakMs: number | null;
  stepIndex: number;
  stepLabel: string;
  camera: StallCameraSnapshot;
  longTaskCount: number;
  longTaskMs: number | null;
  modelResourceCount: number;
  likelyCause: string;
  resources: ModelResourceEntry[];
}

export interface RouteAnalysis {
  frameStats: FrameStats;
  stepStats: StepStats[];
  stallCount: number;
  severeStallCount: number;
  totalStallMs: number;
  hotspots: StallWindow[];
}

export interface RouteRunRecord {
  id: string;
  suiteId: string | null;
  routeId: string;
  routeName: string;
  variantId: string;
  variantName: string;
  renderScalePercent: number;
  startedAt: number;
  startedPerfTime: number;
  longTaskStartIndex: number;
  resourceStartIndex: number;
  frames: FrameSample[];
  lodWarmups: LodWarmupEntry[];
  status?: string;
  finishedAt?: number;
  loadMs?: number | null;
  firstFrameMs?: number | null;
  motionAvgMs?: number | null;
  motionMaxMs?: number | null;
  analysis?: RouteAnalysis;
  trace?: {
    frames: FrameSample[];
    longTasks: LongTaskEntry[];
    modelResources: ModelResourceEntry[];
    lodWarmups: LodWarmupEntry[];
  };
}

export interface VariantBenchmark {
  loadMs: number | null;
  firstFrameMs: number | null;
  motionTime: number;
  motionFrames: number;
  motionMaxMs: number | null;
  lastMotionMs: number | null;
  lastMotionMaxMs: number | null;
  wasMoving: boolean;
}

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface PerformanceMode {
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

export interface RenderScaleAppLike {
  graphicsDevice: {
    maxPixelRatio: number;
    canvas?: HTMLCanvasElement | null;
    setResolution?: (width: number, height: number) => void;
  };
}

export interface RenderScaleRuntimeLike {
  performanceMode?: PerformanceMode | null;
  app?: RenderScaleAppLike | null;
  requestRender?: (() => void) | null;
}
