import { create } from 'zustand';

import type {
  CameraViewState,
  PresetPanelViewState,
  RouteDiagnosticsViewState,
  VariantPanelViewState
} from '../types';

interface SelectionRequest {
  id: string | null;
  sequence: number;
}

interface ViewerUiStoreState {
  camera: CameraViewState;
  routeDiagnostics: RouteDiagnosticsViewState;
  variantPanel: VariantPanelViewState | null;
  presetPanel: PresetPanelViewState | null;
  variantSelectionRequest: SelectionRequest;
  presetSelectionRequest: SelectionRequest;
  setCamera: (camera: CameraViewState) => void;
  setRouteDiagnostics: (routeDiagnostics: RouteDiagnosticsViewState) => void;
  setVariantPanel: (variantPanel: VariantPanelViewState) => void;
  setPresetPanel: (presetPanel: PresetPanelViewState) => void;
  requestVariantSelection: (variantId: string) => void;
  requestPresetSelection: (presetId: string) => void;
}

export const emptyCameraState: CameraViewState = {
  summary: '等待视角',
  position: '—',
  target: '—',
  distance: '—',
  angle: '—'
};

export const emptyRouteDiagnosticsState: RouteDiagnosticsViewState = {
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

export const useViewerUiStore = create<ViewerUiStoreState>((set) => ({
  camera: emptyCameraState,
  routeDiagnostics: emptyRouteDiagnosticsState,
  variantPanel: null,
  presetPanel: null,
  variantSelectionRequest: {
    id: null,
    sequence: 0
  },
  presetSelectionRequest: {
    id: null,
    sequence: 0
  },
  setCamera: (camera) => set({ camera }),
  setRouteDiagnostics: (routeDiagnostics) => set({ routeDiagnostics }),
  setVariantPanel: (variantPanel) => set({ variantPanel }),
  setPresetPanel: (presetPanel) => set({ presetPanel }),
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
    }))
}));
