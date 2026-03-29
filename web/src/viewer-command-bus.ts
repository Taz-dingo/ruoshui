interface CopyRouteAnalysisJsonCommand {
  type: 'copy-route-analysis-json';
}

interface CopyRouteAnalysisSummaryCommand {
  type: 'copy-route-analysis-summary';
}

interface DownloadRouteAnalysisJsonCommand {
  type: 'download-route-analysis-json';
}

interface RenderScaleChangeCommand {
  type: 'set-render-scale';
  value: number;
}

interface RunCurrentRouteBenchmarkCommand {
  type: 'run-current-route-benchmark';
}

interface RunRouteSuiteCommand {
  type: 'run-route-suite';
}

interface SceneLookChangeCommand {
  type: 'set-scene-look';
  brightnessPercent: number;
  contrastPercent: number;
  saturationPercent: number;
}

interface SelectPresetCommand {
  type: 'select-preset';
  presetId: string;
}

interface SelectRouteCommand {
  type: 'select-route';
  routeId: string;
}

interface SelectVariantCommand {
  type: 'select-variant';
  variantId: string;
}

type ViewerCommand =
  | CopyRouteAnalysisJsonCommand
  | CopyRouteAnalysisSummaryCommand
  | DownloadRouteAnalysisJsonCommand
  | RenderScaleChangeCommand
  | RunCurrentRouteBenchmarkCommand
  | RunRouteSuiteCommand
  | SceneLookChangeCommand
  | SelectPresetCommand
  | SelectRouteCommand
  | SelectVariantCommand;

type ViewerCommandListener = (command: ViewerCommand) => void;

const listeners = new Set<ViewerCommandListener>();

function emitViewerCommand(command: ViewerCommand) {
  listeners.forEach((listener) => {
    listener(command);
  });
}

function subscribeViewerCommands(listener: ViewerCommandListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function requestCopyRouteAnalysisJson() {
  emitViewerCommand({ type: 'copy-route-analysis-json' });
}

function requestCopyRouteAnalysisSummary() {
  emitViewerCommand({ type: 'copy-route-analysis-summary' });
}

function requestDownloadRouteAnalysisJson() {
  emitViewerCommand({ type: 'download-route-analysis-json' });
}

function requestPresetSelection(presetId: string) {
  emitViewerCommand({
    type: 'select-preset',
    presetId
  });
}

function requestRenderScaleChange(value: number) {
  emitViewerCommand({
    type: 'set-render-scale',
    value
  });
}

function requestRouteSelection(routeId: string) {
  emitViewerCommand({
    type: 'select-route',
    routeId
  });
}

function requestRunCurrentRouteBenchmark() {
  emitViewerCommand({ type: 'run-current-route-benchmark' });
}

function requestRunRouteSuite() {
  emitViewerCommand({ type: 'run-route-suite' });
}

function requestSceneLookChange(command: Omit<SceneLookChangeCommand, 'type'>) {
  emitViewerCommand({
    type: 'set-scene-look',
    ...command
  });
}

function requestVariantSelection(variantId: string) {
  emitViewerCommand({
    type: 'select-variant',
    variantId
  });
}

export {
  requestCopyRouteAnalysisJson,
  requestCopyRouteAnalysisSummary,
  requestDownloadRouteAnalysisJson,
  requestPresetSelection,
  requestRenderScaleChange,
  requestRouteSelection,
  requestRunCurrentRouteBenchmark,
  requestRunRouteSuite,
  requestSceneLookChange,
  requestVariantSelection,
  subscribeViewerCommands
};

export type {
  ViewerCommand
};
