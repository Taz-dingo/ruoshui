interface LongTaskEntry {
  startMs: number;
  durationMs: number;
}

interface ModelResourceEntry {
  name: string;
  startMs: number;
  durationMs: number;
  transferSize: number;
  encodedBodySize: number;
}

interface LodWarmupEntry {
  elapsedMs: number | null;
  mode: string;
  pitch: number;
  distance: number | null;
  score: number | null;
}

type FrameSample = [
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

interface FrameStats {
  sampleCount: number;
  avgMs: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  peakMs: number | null;
}

interface StepStats {
  stepIndex: number;
  label: string;
  avgMs: number | null;
  p95Ms: number | null;
  peakMs: number | null;
  sampleCount: number;
}

interface StallCameraSnapshot {
  position: [number, number, number];
  target: [number, number, number];
  distance: number;
  pitch: number;
  yaw: number;
}

interface StallWindow {
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

interface RouteAnalysis {
  frameStats: FrameStats;
  stepStats: StepStats[];
  stallCount: number;
  severeStallCount: number;
  totalStallMs: number;
  hotspots: StallWindow[];
}

interface RouteRunRecord {
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

interface VariantBenchmark {
  loadMs: number | null;
  firstFrameMs: number | null;
  motionTime: number;
  motionFrames: number;
  motionMaxMs: number | null;
  lastMotionMs: number | null;
  lastMotionMaxMs: number | null;
  wasMoving: boolean;
}

export type {
  FrameSample,
  FrameStats,
  LodWarmupEntry,
  LongTaskEntry,
  ModelResourceEntry,
  RouteAnalysis,
  RouteRunRecord,
  StallCameraSnapshot,
  StallWindow,
  StepStats,
  VariantBenchmark
};
