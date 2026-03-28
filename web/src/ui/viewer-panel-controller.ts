import {
  syncPresetPanelState,
  syncRouteControlsState,
  syncVariantPanelState,
} from "./viewer-ui-sync";
import type { BenchmarkRoute, CameraPreset, ViewerVariant } from "../types";

interface CreateViewerPanelControllerArgs {
  variants: ViewerVariant[];
  defaultVariant: ViewerVariant;
  presets: CameraPreset[];
  firstPreset: CameraPreset;
  benchmarkRoutes: BenchmarkRoute[];
  variantCount: number;
  currentVariantRepeatCount: number;
  getActiveVariantId: () => string;
  getActivePresetId: () => string;
  getSelectedRouteId: () => string | null;
  getActiveRouteId: () => string | null;
  getRouteSummaryText: () => string;
  getIsBatchBenchmarkRunning: () => boolean;
  getIsVariantPanelDisabled: () => boolean;
  setIsVariantPanelDisabled: (disabled: boolean) => void;
}

function createViewerPanelController({
  variants,
  defaultVariant,
  presets,
  firstPreset,
  benchmarkRoutes,
  variantCount,
  currentVariantRepeatCount,
  getActiveVariantId,
  getActivePresetId,
  getSelectedRouteId,
  getActiveRouteId,
  getRouteSummaryText,
  getIsBatchBenchmarkRunning,
  getIsVariantPanelDisabled,
  setIsVariantPanelDisabled,
}: CreateViewerPanelControllerArgs) {
  const publishVariantPanel = () => {
    syncVariantPanelState({
      variants,
      activeVariantId: getActiveVariantId(),
      defaultVariant,
      disabled: getIsVariantPanelDisabled(),
    });
  };

  const publishPresetPanel = () => {
    syncPresetPanelState({
      presets,
      activePresetId: getActivePresetId(),
      firstPreset,
    });
  };

  const publishRouteControls = () => {
    syncRouteControlsState({
      benchmarkRoutes,
      selectedRouteId: getSelectedRouteId(),
      activeRouteId: getActiveRouteId(),
      routeSummaryText: getRouteSummaryText(),
      variantCount,
      isBatchBenchmarkRunning: getIsBatchBenchmarkRunning(),
      currentVariantRepeatCount,
    });
  };

  const updatePresetButtons = () => {
    publishPresetPanel();
  };

  const updateVariantButtons = () => {
    publishVariantPanel();
  };

  const updateRouteButtons = () => {
    publishRouteControls();
  };

  const setVariantButtonsDisabled = (disabled: boolean) => {
    setIsVariantPanelDisabled(disabled);
    publishVariantPanel();
  };

  return {
    publishPresetPanel,
    publishRouteControls,
    publishVariantPanel,
    setVariantButtonsDisabled,
    updatePresetButtons,
    updateRouteButtons,
    updateVariantButtons,
  };
}

export {
  createViewerPanelController,
};
