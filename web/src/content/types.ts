interface ViewerScene {
  title: string;
  subtitle: string;
  summary: string;
  format: string;
  bounds: string;
  defaultVariantId: string;
}

interface UnifiedGsplatProfile {
  lodUnderfillLimit?: number;
  cooldownTicks?: number;
  lodUpdateDistance?: number;
  lodUpdateAngle?: number;
  lodBehindPenalty?: number;
}

interface ViewerVariant {
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

interface CameraPreset {
  id: string;
  name: string;
  summary: string;
  position: [number, number, number];
  target: [number, number, number];
}

interface BenchmarkRouteStep {
  position: [number, number, number];
  target: [number, number, number];
  duration: number;
  hold: number;
}

interface BenchmarkRoute {
  id: string;
  name: string;
  summary: string;
  steps: BenchmarkRouteStep[];
}

interface ViewerHighlight {
  id: string;
  name: string;
  title: string;
  body: string;
  presetId: string;
}

interface ViewerContent {
  scene: ViewerScene;
  variants: ViewerVariant[];
  visualThesis?: string;
  interactionThesis?: string[];
  presets: CameraPreset[];
  benchmarkRoutes?: BenchmarkRoute[];
  highlights?: ViewerHighlight[];
}

export type {
  BenchmarkRoute,
  BenchmarkRouteStep,
  CameraPreset,
  UnifiedGsplatProfile,
  ViewerContent,
  ViewerHighlight,
  ViewerScene,
  ViewerVariant
};
