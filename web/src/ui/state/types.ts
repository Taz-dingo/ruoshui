interface RouteLogEntryView {
  id: string;
  routeName: string;
  status: string;
  statusLabel: string;
  meta: string;
  motionText: string;
  firstFrameText: string;
}

interface RouteAnalysisRankingItemView {
  id: string;
  variantName: string;
  avgMs: string;
  peakMs: string;
  p95Ms: string;
  p99Ms: string;
  stallCount: number;
  worstStepLabel: string;
  worstStepP95Ms: string;
  worstStepPeakMs: string;
}

interface RouteAnalysisHotspotItemView {
  id: string;
  variantName: string;
  peakMs: number | null;
  stepLabel: string;
  likelyCause: string;
  startMs: number | null;
  endMs: number | null;
  longTaskCount: number;
  modelResourceCount: number;
  cameraDistance: number;
  cameraPitch: number;
  cameraYaw: number;
  resourceSummary: string;
}

interface RouteDiagnosticsViewState {
  logSummary: string;
  logItems: RouteLogEntryView[];
  logEmptyText: string | null;
  analysisSummary: string;
  copyNote: string;
  rankingItems: RouteAnalysisRankingItemView[];
  rankingEmptyText: string | null;
  hotspotItems: RouteAnalysisHotspotItemView[];
  hotspotEmptyText: string | null;
}

interface CameraViewState {
  summary: string;
  position: string;
  target: string;
  distance: string;
  angle: string;
  positionValue: [number, number, number] | null;
  targetValue: [number, number, number] | null;
  distanceValue: number | null;
  pitchValue: number | null;
  yawValue: number | null;
}

interface HighlightPinView {
  id: string;
  name: string;
  left: number;
  top: number;
  isVisible: boolean;
}

interface HighlightOverlayViewState {
  items: HighlightPinView[];
}

interface HighlightAuthoringViewState {
  isEnabled: boolean;
  planeY: number;
  planeYValue: string;
  summary: string;
  point: string;
  pointPosition: [number, number, number] | null;
  previewLeft: number;
  previewTop: number;
  previewVisible: boolean;
  note: string;
  jsonSnippet: string;
  copyNote: string;
}

interface LoadingViewState {
  visible: boolean;
  mode: 'boot' | 'switch';
}

interface StatusViewState {
  title: string;
  detail: string;
}

interface SceneMetaViewState {
  title: string;
  size: string;
  splats: string;
  retention: string;
  note: string;
}

interface SceneMetricsViewState {
  load: string;
  firstFrame: string;
  motion: string;
}

interface RenderScaleViewState {
  summary: string;
  value: string;
  note: string;
}

interface SceneLookViewState {
  summary: string;
  brightnessPercent: number;
  contrastPercent: number;
  saturationPercent: number;
  brightnessValue: string;
  contrastValue: string;
  saturationValue: string;
}

interface PerfHudViewState {
  fps: string;
  ms: string;
  render: string;
  scale: string;
  backend: string;
}

interface VariantPanelItemView {
  id: string;
  name: string;
  meta: string;
  isActive: boolean;
  disabled: boolean;
}

interface VariantPanelViewState {
  summary: string;
  items: VariantPanelItemView[];
}

interface PresetPanelItemView {
  id: string;
  name: string;
  summary: string;
  isActive: boolean;
}

interface PresetPanelViewState {
  summary: string;
  items: PresetPanelItemView[];
}

interface RouteControlItemView {
  id: string;
  name: string;
  summary: string;
  isActive: boolean;
  isRunning: boolean;
  disabled: boolean;
}

interface RouteControlsViewState {
  summary: string;
  batchNote: string;
  runCurrentLabel: string;
  runSuiteLabel: string;
  runCurrentDisabled: boolean;
  runSuiteDisabled: boolean;
  items: RouteControlItemView[];
}

export type {
  HighlightAuthoringViewState,
  CameraViewState,
  HighlightOverlayViewState,
  HighlightPinView,
  LoadingViewState,
  PerfHudViewState,
  PresetPanelItemView,
  PresetPanelViewState,
  RenderScaleViewState,
  RouteAnalysisHotspotItemView,
  RouteAnalysisRankingItemView,
  RouteControlItemView,
  RouteControlsViewState,
  RouteDiagnosticsViewState,
  RouteLogEntryView,
  SceneLookViewState,
  SceneMetaViewState,
  SceneMetricsViewState,
  StatusViewState,
  VariantPanelItemView,
  VariantPanelViewState
};
