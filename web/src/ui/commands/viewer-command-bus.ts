interface CopyRouteAnalysisJsonCommand {
  type: 'copy-route-analysis-json';
}

interface CopyRouteAnalysisSummaryCommand {
  type: 'copy-route-analysis-summary';
}

interface CopyHighlightDraftCommand {
  type: 'copy-highlight-draft';
}

interface CaptureHighlightPointCommand {
  type: 'capture-highlight-point';
  clientX: number;
  clientY: number;
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

interface SetHighlightAuthoringEnabledCommand {
  type: 'set-highlight-authoring-enabled';
  enabled: boolean;
}

interface SetHighlightPlaneYCommand {
  type: 'set-highlight-plane-y';
  value: number;
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
  | CopyHighlightDraftCommand
  | CaptureHighlightPointCommand
  | DownloadRouteAnalysisJsonCommand
  | RenderScaleChangeCommand
  | RunCurrentRouteBenchmarkCommand
  | RunRouteSuiteCommand
  | SceneLookChangeCommand
  | SetHighlightAuthoringEnabledCommand
  | SetHighlightPlaneYCommand
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

function requestCopyHighlightDraft() {
  emitViewerCommand({ type: 'copy-highlight-draft' });
}

function requestCaptureHighlightPoint(clientX: number, clientY: number) {
  emitViewerCommand({
    type: 'capture-highlight-point',
    clientX,
    clientY
  });
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

function requestSetHighlightAuthoringEnabled(enabled: boolean) {
  emitViewerCommand({
    type: 'set-highlight-authoring-enabled',
    enabled
  });
}

function requestSetHighlightPlaneY(value: number) {
  emitViewerCommand({
    type: 'set-highlight-plane-y',
    value
  });
}

function requestVariantSelection(variantId: string) {
  emitViewerCommand({
    type: 'select-variant',
    variantId
  });
}

export {
  requestCaptureHighlightPoint,
  requestCopyHighlightDraft,
  requestCopyRouteAnalysisJson,
  requestCopyRouteAnalysisSummary,
  requestDownloadRouteAnalysisJson,
  requestPresetSelection,
  requestRenderScaleChange,
  requestRouteSelection,
  requestRunCurrentRouteBenchmark,
  requestRunRouteSuite,
  requestSceneLookChange,
  requestSetHighlightAuthoringEnabled,
  requestSetHighlightPlaneY,
  requestVariantSelection,
  subscribeViewerCommands
};

export type {
  ViewerCommand
};
