import { create } from 'zustand';

import type {
  CameraViewState,
  HighlightAuthoringViewState,
  HighlightOverlayViewState,
  LoadingViewState,
  PerfHudViewState,
  PresetPanelViewState,
  RenderScaleViewState,
  RouteControlsViewState,
  RouteDiagnosticsViewState,
  SceneLookViewState,
  SceneMetaViewState,
  SceneMetricsViewState,
  StatusViewState,
  ViewCaptureViewState,
  VariantPanelViewState
} from './types';

interface ViewerUiStoreState {
  blockingError: {
    detail: string;
    recoveryHint: string;
    title: string;
  } | null;
  camera: CameraViewState;
  highlightAuthoring: HighlightAuthoringViewState;
  highlightOverlay: HighlightOverlayViewState;
  loading: LoadingViewState;
  perfHud: PerfHudViewState;
  renderScale: RenderScaleViewState;
  routeDiagnostics: RouteDiagnosticsViewState;
  sceneLook: SceneLookViewState;
  sceneMeta: SceneMetaViewState;
  sceneMetrics: SceneMetricsViewState;
  status: StatusViewState;
  viewCapture: ViewCaptureViewState;
  variantPanel: VariantPanelViewState | null;
  presetPanel: PresetPanelViewState | null;
  routeControls: RouteControlsViewState | null;
  setCamera: (camera: CameraViewState) => void;
  setBlockingError: (
    blockingError: {
      detail: string;
      recoveryHint: string;
      title: string;
    } | null
  ) => void;
  setHighlightAuthoring: (highlightAuthoring: HighlightAuthoringViewState) => void;
  setHighlightOverlay: (highlightOverlay: HighlightOverlayViewState) => void;
  setLoading: (loading: LoadingViewState) => void;
  setPerfHud: (perfHud: PerfHudViewState) => void;
  setRenderScale: (renderScale: RenderScaleViewState) => void;
  setRouteDiagnostics: (routeDiagnostics: RouteDiagnosticsViewState) => void;
  setSceneLook: (sceneLook: SceneLookViewState) => void;
  setSceneMeta: (sceneMeta: SceneMetaViewState) => void;
  setSceneMetrics: (sceneMetrics: SceneMetricsViewState) => void;
  setStatus: (status: StatusViewState) => void;
  setViewCapture: (viewCapture: ViewCaptureViewState) => void;
  setVariantPanel: (variantPanel: VariantPanelViewState) => void;
  setPresetPanel: (presetPanel: PresetPanelViewState) => void;
  setRouteControls: (routeControls: RouteControlsViewState) => void;
}

const emptyCameraState: CameraViewState = {
  summary: '等待视角',
  position: '—',
  target: '—',
  distance: '—',
  angle: '—',
  positionValue: null,
  targetValue: null,
  visibleGroundPolygonValue: [],
  distanceValue: null,
  pitchValue: null,
  yawValue: null
};

const emptyBlockingErrorState = null;

const emptyRouteDiagnosticsState: RouteDiagnosticsViewState = {
  logSummary: '暂无',
  logItems: [],
  logEmptyText: '跑一次轨迹后，这里会自动留下对比记录。',
  analysisSummary: '等待批量测试',
  copyNote: '跑完一轮标准测试后可复制。',
  rankingItems: [],
  rankingEmptyText: '运行“当前轨迹 × 全版本”后，这里会出现排行榜和卡顿热点。',
  hotspotItems: [],
  hotspotEmptyText: null
};

const emptyHighlightOverlayState: HighlightOverlayViewState = {
  items: []
};

const emptyHighlightAuthoringState: HighlightAuthoringViewState = {
  isEnabled: false,
  planeY: 0.08,
  planeYValue: '0.08',
  summary: '关闭',
  point: '—',
  pointPosition: null,
  previewLeft: 0,
  previewTop: 0,
  previewVisible: false,
  note: '进入打点模式后，点击场景记录一个近似落点。',
  jsonSnippet: '',
  copyNote: '生成后可复制 JSON。'
};

const emptyStatusState: StatusViewState = {
  tone: 'info',
  title: '准备加载场景',
  detail: '连接运行时'
};

const emptyLoadingState: LoadingViewState = {
  visible: true,
  mode: 'boot'
};

const emptySceneMetaState: SceneMetaViewState = {
  title: '—',
  size: '—',
  splats: '—',
  retention: '—',
  note: '—'
};

const emptySceneMetricsState: SceneMetricsViewState = {
  load: '—',
  firstFrame: '—',
  motion: '待采样'
};

const emptyRenderScaleState: RenderScaleViewState = {
  summary: '—',
  value: '—',
  note: '等待渲染参数',
  antiAliasEnabled: false,
  antiAliasAvailable: false,
  antiAliasSummary: '关闭',
  antiAliasNote: '当前暂未开放'
};

const emptySceneLookState: SceneLookViewState = {
  summary: '默认',
  brightnessPercent: 100,
  contrastPercent: 100,
  saturationPercent: 100,
  brightnessValue: '—',
  contrastValue: '—',
  saturationValue: '—'
};

const emptyPerfHudState: PerfHudViewState = {
  fps: '—',
  ms: '—',
  render: '启动中',
  scale: '—',
  backend: '—',
  gpu: '检测中'
};

const emptyViewCaptureState: ViewCaptureViewState = {
  summary: '未采集',
  note: '移动到想看的位置后，可采当前视角；也可以自动跑完整个预设序列。',
  isRunning: false,
  itemCount: 0,
  items: []
};

const useViewerUiStore = create<ViewerUiStoreState>((set) => ({
  blockingError: emptyBlockingErrorState,
  camera: emptyCameraState,
  highlightAuthoring: emptyHighlightAuthoringState,
  highlightOverlay: emptyHighlightOverlayState,
  loading: emptyLoadingState,
  perfHud: emptyPerfHudState,
  renderScale: emptyRenderScaleState,
  routeDiagnostics: emptyRouteDiagnosticsState,
  sceneLook: emptySceneLookState,
  sceneMeta: emptySceneMetaState,
  sceneMetrics: emptySceneMetricsState,
  status: emptyStatusState,
  viewCapture: emptyViewCaptureState,
  variantPanel: null,
  presetPanel: null,
  routeControls: null,
  setCamera: (camera) => set({ camera }),
  setBlockingError: (blockingError) => set({ blockingError }),
  setHighlightAuthoring: (highlightAuthoring) => set({ highlightAuthoring }),
  setHighlightOverlay: (highlightOverlay) => set({ highlightOverlay }),
  setLoading: (loading) => set({ loading }),
  setPerfHud: (perfHud) => set({ perfHud }),
  setRenderScale: (renderScale) => set({ renderScale }),
  setRouteDiagnostics: (routeDiagnostics) => set({ routeDiagnostics }),
  setSceneLook: (sceneLook) => set({ sceneLook }),
  setSceneMeta: (sceneMeta) => set({ sceneMeta }),
  setSceneMetrics: (sceneMetrics) => set({ sceneMetrics }),
  setStatus: (status) => set({ status }),
  setViewCapture: (viewCapture) => set({ viewCapture }),
  setVariantPanel: (variantPanel) => set({ variantPanel }),
  setPresetPanel: (presetPanel) => set({ presetPanel }),
  setRouteControls: (routeControls) => set({ routeControls })
}));

export {
  emptyBlockingErrorState,
  emptyCameraState,
  emptyHighlightAuthoringState,
  emptyHighlightOverlayState,
  emptyLoadingState,
  emptyPerfHudState,
  emptyRenderScaleState,
  emptyRouteDiagnosticsState,
  emptySceneLookState,
  emptySceneMetaState,
  emptySceneMetricsState,
  emptyStatusState,
  emptyViewCaptureState,
  useViewerUiStore
};
