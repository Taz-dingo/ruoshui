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

interface MiniMapContentRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MiniMapImageTransform {
  rotationDeg?: number;
  scale?: number;
  translateX?: number;
  translateY?: number;
  flipX?: boolean;
  flipY?: boolean;
  invertWorldX?: boolean;
  invertWorldZ?: boolean;
  invertHeadingX?: boolean;
}

interface MiniMapConfig {
  label: string;
  subtitle: string;
  imageUrl?: string;
  imageAspectRatio?: number;
  bounds: MiniMapBounds;
  contentRect?: MiniMapContentRect;
  imageTransform?: MiniMapImageTransform;
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
  communityPinId?: string;
  communityPinTitle?: string;
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
  MiniMapContentRect,
  MiniMapConfig,
  MiniMapImageTransform,
  MiniMapLandmark,
  UnifiedGsplatProfile,
  ViewerContent,
  ViewerHighlight,
  ViewerScene,
  ViewerVariant
};
