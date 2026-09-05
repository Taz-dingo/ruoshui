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

interface CaptureCurrentViewSampleCommand {
  type: 'capture-current-view-sample';
}

interface CapturePresetViewSamplesCommand {
  type: 'capture-preset-view-samples';
}

interface DownloadViewCaptureJsonCommand {
  type: 'download-view-capture-json';
}

interface ClearViewCaptureCommand {
  type: 'clear-view-capture';
}

interface GraphicsBackendPreferenceChangeCommand {
  type: 'set-graphics-backend-preference';
  preference: 'auto' | 'webgl2' | 'webgpu';
}

interface RenderScaleChangeCommand {
  type: 'set-render-scale';
  value: number;
}

interface AntiAliasChangeCommand {
  type: 'set-anti-alias';
  enabled: boolean;
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

interface FocusScenePinCommand {
  type: 'focus-scene-pin';
  pinId: string;
  position: [number, number, number];
  target?: [number, number, number];
  title: string;
}

interface ViewerPlacePin {
  id: string;
  name: string;
  position: [number, number, number];
}

interface SetPlacePinsCommand {
  type: 'set-place-pins';
  pins: ViewerPlacePin[];
}

interface FocusSpatialAnchorCommand {
  type: 'focus-spatial-anchor';
  title: string;
  position: [number, number, number];
  target: [number, number, number];
  fovDeg?: number;
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
  | AntiAliasChangeCommand
  | CopyRouteAnalysisJsonCommand
  | CopyRouteAnalysisSummaryCommand
  | CopyHighlightDraftCommand
  | CaptureHighlightPointCommand
  | CaptureCurrentViewSampleCommand
  | CapturePresetViewSamplesCommand
  | ClearViewCaptureCommand
  | DownloadRouteAnalysisJsonCommand
  | DownloadViewCaptureJsonCommand
  | FocusScenePinCommand
  | FocusSpatialAnchorCommand
  | GraphicsBackendPreferenceChangeCommand
  | RenderScaleChangeCommand
  | RunCurrentRouteBenchmarkCommand
  | RunRouteSuiteCommand
  | SceneLookChangeCommand
  | SetHighlightAuthoringEnabledCommand
  | SetHighlightPlaneYCommand
  | SetPlacePinsCommand
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

function requestCaptureCurrentViewSample() {
  emitViewerCommand({ type: 'capture-current-view-sample' });
}

function requestCapturePresetViewSamples() {
  emitViewerCommand({ type: 'capture-preset-view-samples' });
}

function requestClearViewCapture() {
  emitViewerCommand({ type: 'clear-view-capture' });
}

function requestDownloadRouteAnalysisJson() {
  emitViewerCommand({ type: 'download-route-analysis-json' });
}

function requestDownloadViewCaptureJson() {
  emitViewerCommand({ type: 'download-view-capture-json' });
}

function requestFocusScenePin(command: Omit<FocusScenePinCommand, 'type'>) {
  emitViewerCommand({
    type: 'focus-scene-pin',
    ...command
  });
}

function requestFocusSpatialAnchor(command: Omit<FocusSpatialAnchorCommand, 'type'>) {
  emitViewerCommand({
    type: 'focus-spatial-anchor',
    ...command
  });
}

function requestSetPlacePins(pins: ViewerPlacePin[]) {
  emitViewerCommand({
    type: 'set-place-pins',
    pins
  });
}

function requestGraphicsBackendPreferenceChange(
  preference: 'auto' | 'webgl2' | 'webgpu'
) {
  emitViewerCommand({
    type: 'set-graphics-backend-preference',
    preference
  });
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

function requestAntiAliasChange(enabled: boolean) {
  emitViewerCommand({
    type: 'set-anti-alias',
    enabled
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
  requestAntiAliasChange,
  requestCaptureCurrentViewSample,
  requestCaptureHighlightPoint,
  requestCapturePresetViewSamples,
  requestClearViewCapture,
  requestCopyHighlightDraft,
  requestCopyRouteAnalysisJson,
  requestCopyRouteAnalysisSummary,
  requestDownloadRouteAnalysisJson,
  requestDownloadViewCaptureJson,
  requestFocusScenePin,
  requestFocusSpatialAnchor,
  requestGraphicsBackendPreferenceChange,
  requestPresetSelection,
  requestRenderScaleChange,
  requestRouteSelection,
  requestRunCurrentRouteBenchmark,
  requestRunRouteSuite,
  requestSceneLookChange,
  requestSetHighlightAuthoringEnabled,
  requestSetHighlightPlaneY,
  requestSetPlacePins,
  requestVariantSelection,
  subscribeViewerCommands
};

export type {
  ViewerCommand,
  ViewerPlacePin
};
