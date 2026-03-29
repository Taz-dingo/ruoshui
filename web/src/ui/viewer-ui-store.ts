import { create } from 'zustand';

import type {
  CameraViewState,
  PerfHudViewState,
  PresetPanelViewState,
  RenderScaleViewState,
  RouteControlsViewState,
  RouteDiagnosticsViewState,
  SceneLookViewState,
  SceneMetaViewState,
  SceneMetricsViewState,
  StatusViewState,
  VariantPanelViewState
} from './types';

interface ViewerUiStoreState {
  camera: CameraViewState;
  perfHud: PerfHudViewState;
  renderScale: RenderScaleViewState;
  routeDiagnostics: RouteDiagnosticsViewState;
  sceneLook: SceneLookViewState;
  sceneMeta: SceneMetaViewState;
  sceneMetrics: SceneMetricsViewState;
  status: StatusViewState;
  variantPanel: VariantPanelViewState | null;
  presetPanel: PresetPanelViewState | null;
  routeControls: RouteControlsViewState | null;
  setCamera: (camera: CameraViewState) => void;
  setPerfHud: (perfHud: PerfHudViewState) => void;
  setRenderScale: (renderScale: RenderScaleViewState) => void;
  setRouteDiagnostics: (routeDiagnostics: RouteDiagnosticsViewState) => void;
  setSceneLook: (sceneLook: SceneLookViewState) => void;
  setSceneMeta: (sceneMeta: SceneMetaViewState) => void;
  setSceneMetrics: (sceneMetrics: SceneMetricsViewState) => void;
  setStatus: (status: StatusViewState) => void;
  setVariantPanel: (variantPanel: VariantPanelViewState) => void;
  setPresetPanel: (presetPanel: PresetPanelViewState) => void;
  setRouteControls: (routeControls: RouteControlsViewState) => void;
}

const emptyCameraState: CameraViewState = {
  summary: '等待视角',
  position: '—',
  target: '—',
  distance: '—',
  angle: '—'
};

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

const emptyStatusState: StatusViewState = {
  title: '准备加载场景',
  detail: '连接运行时'
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
  note: '等待渲染参数'
};

const emptySceneLookState: SceneLookViewState = {
  summary: '默认',
  brightnessPercent: 105,
  contrastPercent: 120,
  saturationPercent: 115,
  brightnessValue: '—',
  contrastValue: '—',
  saturationValue: '—'
};

const emptyPerfHudState: PerfHudViewState = {
  fps: '—',
  ms: '—',
  render: '启动中',
  scale: '—'
};

const useViewerUiStore = create<ViewerUiStoreState>((set) => ({
  camera: emptyCameraState,
  perfHud: emptyPerfHudState,
  renderScale: emptyRenderScaleState,
  routeDiagnostics: emptyRouteDiagnosticsState,
  sceneLook: emptySceneLookState,
  sceneMeta: emptySceneMetaState,
  sceneMetrics: emptySceneMetricsState,
  status: emptyStatusState,
  variantPanel: null,
  presetPanel: null,
  routeControls: null,
  setCamera: (camera) => set({ camera }),
  setPerfHud: (perfHud) => set({ perfHud }),
  setRenderScale: (renderScale) => set({ renderScale }),
  setRouteDiagnostics: (routeDiagnostics) => set({ routeDiagnostics }),
  setSceneLook: (sceneLook) => set({ sceneLook }),
  setSceneMeta: (sceneMeta) => set({ sceneMeta }),
  setSceneMetrics: (sceneMetrics) => set({ sceneMetrics }),
  setStatus: (status) => set({ status }),
  setVariantPanel: (variantPanel) => set({ variantPanel }),
  setPresetPanel: (presetPanel) => set({ presetPanel }),
  setRouteControls: (routeControls) => set({ routeControls })
}));

export {
  emptyCameraState,
  emptyPerfHudState,
  emptyRenderScaleState,
  emptyRouteDiagnosticsState,
  emptySceneLookState,
  emptySceneMetaState,
  emptySceneMetricsState,
  emptyStatusState,
  useViewerUiStore
};
