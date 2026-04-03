interface ViewerScene {
  title: string;
  subtitle: string;
  summary: string;
  format: string;
  bounds: string;
  defaultVariantId: string;
  miniMap?: MiniMapConfig;
}

interface MiniMapBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface MiniMapLandmark {
  id: string;
  name: string;
  x: number;
  z: number;
}

interface MiniMapConfig {
  label: string;
  subtitle: string;
  imageUrl?: string;
  bounds: MiniMapBounds;
  northAngleDeg?: number;
  landmarks?: MiniMapLandmark[];
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
  position: [number, number, number];
  imageUrl?: string;
  imageAlt?: string;
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
  MiniMapBounds,
  MiniMapConfig,
  MiniMapLandmark,
  UnifiedGsplatProfile,
  ViewerContent,
  ViewerHighlight,
  ViewerScene,
  ViewerVariant
};
