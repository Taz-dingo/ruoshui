import { renderScaleMinPercent } from '../config';
import {
  getInitialRenderScalePercent,
  getMaxSupportedPixelRatio
} from '../performance/render-scale';
import type {
  PresetPanelViewState,
  RouteControlsViewState,
  VariantPanelViewState
} from '../ui/state/types';
import type {
  BenchmarkRoute,
  CameraPreset,
  ViewerContent,
  ViewerVariant
} from '../content/types';

interface ViewerConfig {
  activeRenderScalePercent: number;
  benchmarkRoutes: BenchmarkRoute[];
  benchmarkRoutesById: Map<string, BenchmarkRoute>;
  defaultVariant: ViewerVariant;
  firstPreset: CameraPreset;
  initialPresetPanel: PresetPanelViewState;
  initialRouteControls: RouteControlsViewState;
  initialVariantPanel: VariantPanelViewState;
  maxRenderScalePercent: number;
  renderScaleMinPercent: number;
  showPerfHud: boolean;
  variantsById: Map<string, ViewerVariant>;
}

interface CreateViewerConfigArgs {
  data: ViewerContent;
  runtimeWindow: Window;
  showPerfHud: boolean;
}

function requireDefaultVariant(data: ViewerContent) {
  const defaultVariant =
    data.variants.find((variant) => variant.id === data.scene.defaultVariantId) ??
    data.variants[0];

  if (!defaultVariant) {
    throw new Error('Missing default variant');
  }

  return defaultVariant;
}

function requireFirstPreset(data: ViewerContent) {
  const firstPreset = data.presets[0];
  if (!firstPreset) {
    throw new Error('Missing camera presets');
  }

  return firstPreset;
}

function buildInitialVariantPanel(
  data: ViewerContent,
  defaultVariant: ViewerVariant
) {
  return {
    summary: defaultVariant.name,
    items: data.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      meta: `${variant.size} · ${variant.retention}`,
      isActive: variant.id === defaultVariant.id,
      disabled: false
    }))
  };
}

function buildInitialPresetPanel(data: ViewerContent, firstPreset: CameraPreset) {
  return {
    summary: firstPreset.name,
    items: data.presets.map((preset) => ({
      id: preset.id,
      name: preset.name,
      summary: preset.summary,
      isActive: preset.id === firstPreset.id
    }))
  };
}

function buildInitialRouteControls(data: ViewerContent) {
  const benchmarkRoutes = data.benchmarkRoutes ?? [];

  return {
    summary: '未播放',
    batchNote: benchmarkRoutes[0]
      ? `${benchmarkRoutes[0].name} · 当前版本或 ${data.variants.length} 个版本`
      : '先选择一条轨迹，再批量跑所有版本。',
    runCurrentLabel: '跑当前轨迹 × 当前版本 ×3',
    runSuiteLabel: '跑当前轨迹 × 全版本',
    runCurrentDisabled: benchmarkRoutes.length === 0,
    runSuiteDisabled: benchmarkRoutes.length === 0,
    items: benchmarkRoutes.map((route, index) => ({
      id: route.id,
      name: route.name,
      summary: route.summary,
      isActive: index === 0,
      isRunning: false,
      disabled: false
    }))
  };
}

function createViewerConfig({
  data,
  runtimeWindow,
  showPerfHud
}: CreateViewerConfigArgs): ViewerConfig {
  const defaultVariant = requireDefaultVariant(data);
  const firstPreset = requireFirstPreset(data);
  const benchmarkRoutes = data.benchmarkRoutes ?? [];
  const maxRenderScalePercent = Math.round(
    getMaxSupportedPixelRatio(runtimeWindow) * 100
  );

  return {
    activeRenderScalePercent: getInitialRenderScalePercent(
      runtimeWindow,
      maxRenderScalePercent
    ),
    benchmarkRoutes,
    benchmarkRoutesById: new Map(
      benchmarkRoutes.map((route) => [route.id, route])
    ),
    defaultVariant,
    firstPreset,
    initialPresetPanel: buildInitialPresetPanel(data, firstPreset),
    initialRouteControls: buildInitialRouteControls(data),
    initialVariantPanel: buildInitialVariantPanel(data, defaultVariant),
    maxRenderScalePercent,
    renderScaleMinPercent,
    showPerfHud,
    variantsById: new Map(data.variants.map((variant) => [variant.id, variant]))
  };
}

export {
  createViewerConfig
};

export type {
  ViewerConfig
};
