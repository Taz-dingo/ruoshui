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
} from '../types';

interface SelectionRequest {
  id: string | null;
  sequence: number;
}

interface NumberRequest {
  value: number;
  sequence: number;
}

interface SceneLookRequest {
  brightnessPercent: number;
  contrastPercent: number;
  saturationPercent: number;
  sequence: number;
}

interface ViewerUiStoreState {
  activeInspectorPanel: string | null;
  camera: CameraViewState;
  copyRouteAnalysisJsonRequest: number;
  copyRouteAnalysisSummaryRequest: number;
  downloadRouteAnalysisJsonRequest: number;
  perfHud: PerfHudViewState;
  renderScale: RenderScaleViewState;
  renderScaleRequest: NumberRequest;
  routeDiagnostics: RouteDiagnosticsViewState;
  sceneLook: SceneLookViewState;
  sceneLookRequest: SceneLookRequest;
  sceneMeta: SceneMetaViewState;
  sceneMetrics: SceneMetricsViewState;
  status: StatusViewState;
  variantPanel: VariantPanelViewState | null;
  presetPanel: PresetPanelViewState | null;
  routeControls: RouteControlsViewState | null;
  variantSelectionRequest: SelectionRequest;
  presetSelectionRequest: SelectionRequest;
  routeSelectionRequest: SelectionRequest;
  runCurrentRouteBenchmarkRequest: number;
  runRouteSuiteRequest: number;
  setActiveInspectorPanel: (panelId: string | null) => void;
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
  requestVariantSelection: (variantId: string) => void;
  requestPresetSelection: (presetId: string) => void;
  requestRouteSelection: (routeId: string) => void;
  requestCopyRouteAnalysisJson: () => void;
  requestCopyRouteAnalysisSummary: () => void;
  requestDownloadRouteAnalysisJson: () => void;
  requestRenderScaleChange: (value: number) => void;
  requestSceneLookChange: (sceneLook: Omit<SceneLookRequest, 'sequence'>) => void;
  requestRunCurrentRouteBenchmark: () => void;
  requestRunRouteSuite: () => void;
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
  activeInspectorPanel: null,
  camera: emptyCameraState,
  copyRouteAnalysisJsonRequest: 0,
  copyRouteAnalysisSummaryRequest: 0,
  downloadRouteAnalysisJsonRequest: 0,
  perfHud: emptyPerfHudState,
  renderScale: emptyRenderScaleState,
  renderScaleRequest: {
    value: 100,
    sequence: 0
  },
  routeDiagnostics: emptyRouteDiagnosticsState,
  sceneLook: emptySceneLookState,
  sceneLookRequest: {
    brightnessPercent: emptySceneLookState.brightnessPercent,
    contrastPercent: emptySceneLookState.contrastPercent,
    saturationPercent: emptySceneLookState.saturationPercent,
    sequence: 0
  },
  sceneMeta: emptySceneMetaState,
  sceneMetrics: emptySceneMetricsState,
  status: emptyStatusState,
  variantPanel: null,
  presetPanel: null,
  routeControls: null,
  variantSelectionRequest: {
    id: null,
    sequence: 0
  },
  presetSelectionRequest: {
    id: null,
    sequence: 0
  },
  routeSelectionRequest: {
    id: null,
    sequence: 0
  },
  runCurrentRouteBenchmarkRequest: 0,
  runRouteSuiteRequest: 0,
  setActiveInspectorPanel: (activeInspectorPanel) => set({ activeInspectorPanel }),
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
  setRouteControls: (routeControls) => set({ routeControls }),
  requestVariantSelection: (variantId) =>
    set((state) => ({
      variantSelectionRequest: {
        id: variantId,
        sequence: state.variantSelectionRequest.sequence + 1
      }
    })),
  requestPresetSelection: (presetId) =>
    set((state) => ({
      presetSelectionRequest: {
        id: presetId,
        sequence: state.presetSelectionRequest.sequence + 1
      }
    })),
  requestRouteSelection: (routeId) =>
    set((state) => ({
      routeSelectionRequest: {
        id: routeId,
        sequence: state.routeSelectionRequest.sequence + 1
      }
    })),
  requestCopyRouteAnalysisJson: () =>
    set((state) => ({
      copyRouteAnalysisJsonRequest: state.copyRouteAnalysisJsonRequest + 1
    })),
  requestCopyRouteAnalysisSummary: () =>
    set((state) => ({
      copyRouteAnalysisSummaryRequest: state.copyRouteAnalysisSummaryRequest + 1
    })),
  requestDownloadRouteAnalysisJson: () =>
    set((state) => ({
      downloadRouteAnalysisJsonRequest: state.downloadRouteAnalysisJsonRequest + 1
    })),
  requestRenderScaleChange: (value) =>
    set((state) => ({
      renderScaleRequest: {
        value,
        sequence: state.renderScaleRequest.sequence + 1
      }
    })),
  requestSceneLookChange: (sceneLook) =>
    set((state) => ({
      sceneLookRequest: {
        ...sceneLook,
        sequence: state.sceneLookRequest.sequence + 1
      }
    })),
  requestRunCurrentRouteBenchmark: () =>
    set((state) => ({
      runCurrentRouteBenchmarkRequest: state.runCurrentRouteBenchmarkRequest + 1
    })),
  requestRunRouteSuite: () =>
    set((state) => ({
      runRouteSuiteRequest: state.runRouteSuiteRequest + 1
    }))
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
