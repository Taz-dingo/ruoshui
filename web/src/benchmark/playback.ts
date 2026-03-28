import {
  beginMotionSession,
  createBenchmarkRouteRunRecord,
  finalizeBenchmarkRouteRunRecord
} from './runtime';
import {
  captureOrbitView,
  restoreOrbitView,
  setOrbitPreset,
  type OrbitSnapshot
} from '../runtime/orbit';
import type {
  BenchmarkRoute,
  RouteRunRecord,
  VariantBenchmark,
  ViewerVariant
} from '../types';

interface CameraTargetPreset {
  position: [number, number, number];
  target: [number, number, number];
}

interface RawLongTaskEntry {
  startTime: number;
  duration: number;
}

interface RoutePlaybackState {
  route: BenchmarkRoute;
  onFinish: ((record: RouteRunRecord | null) => void) | null;
  stepIndex: number;
  stepRemaining: number;
}

interface BenchmarkRuntimeState {
  orbit: any;
  benchmark: VariantBenchmark | null | undefined;
  variantId: string;
  variantMeta?: Pick<ViewerVariant, 'name'> | null;
  routeRecord: RouteRunRecord | null;
  routePlayback: RoutePlaybackState | null;
  requestRender?: (() => void) | null;
}

interface MoveRuntimeCameraArgs {
  runtimeState: BenchmarkRuntimeState | null | undefined;
  preset: CameraTargetPreset;
  pc: any;
  vec3: (tuple: [number, number, number]) => any;
  immediate?: boolean;
  duration?: number;
}

interface StartRuntimeBenchmarkRouteArgs {
  runtimeState: BenchmarkRuntimeState | null | undefined;
  route: BenchmarkRoute | null | undefined;
  suiteId: string | null;
  renderScalePercent: number;
  longTaskBuffer: RawLongTaskEntry[];
  onFinish?: ((record: RouteRunRecord | null) => void) | null;
}

interface FinalizeRuntimeRouteRunRecordArgs {
  runtimeState: BenchmarkRuntimeState | null | undefined;
  status: string;
  longTaskBuffer: RawLongTaskEntry[];
  routeRunHistory: RouteRunRecord[];
  maxRouteRunHistory: number;
  routeRunHistoryStorageKey: string;
  persistRouteRunHistory: (storageKey: string, history: RouteRunRecord[]) => void;
  publishRouteDiagnostics: () => void;
  getRouteStepLabel: (routeId: string, stepIndex: number) => string;
}

interface StopRuntimeBenchmarkRouteArgs {
  runtimeState: BenchmarkRuntimeState | null | undefined;
  status?: string;
  finalizeRouteRunRecord: (
    runtimeState: BenchmarkRuntimeState | null | undefined,
    status: string
  ) => RouteRunRecord | null;
}

interface AdvanceRuntimeBenchmarkRouteArgs {
  runtimeState: BenchmarkRuntimeState | null | undefined;
  pc: any;
  vec3: (tuple: [number, number, number]) => any;
  activeRouteId: string | null;
  onActiveRouteCompleted: (summaryText: string, status: string) => void;
  stopRuntimeBenchmarkRoute: (
    runtimeState: BenchmarkRuntimeState | null | undefined,
    status?: string
  ) => void;
  updateRouteSummary: (summaryText: string) => void;
}

interface UpdateRuntimeBenchmarkRouteArgs {
  runtimeState: BenchmarkRuntimeState | null | undefined;
  dt: number;
  advanceRuntimeBenchmarkRoute: () => boolean;
}

interface RestoreRuntimeViewArgs {
  runtimeState: BenchmarkRuntimeState | null | undefined;
  snapshot: OrbitSnapshot | null | undefined;
  pc: any;
}

export function moveRuntimeCamera({
  runtimeState,
  preset,
  pc,
  vec3,
  immediate = false,
  duration = 1.35
}: MoveRuntimeCameraArgs) {
  if (!runtimeState) {
    return;
  }

  setOrbitPreset(
    runtimeState.orbit,
    vec3(preset.position),
    vec3(preset.target),
    immediate,
    pc,
    duration
  );
  runtimeState.requestRender?.();
}

export function startRuntimeBenchmarkRoute({
  runtimeState,
  route,
  suiteId,
  renderScalePercent,
  longTaskBuffer,
  onFinish = null
}: StartRuntimeBenchmarkRouteArgs) {
  if (!runtimeState || !route?.steps?.length) {
    return;
  }

  beginMotionSession(runtimeState.benchmark);
  runtimeState.routeRecord = createBenchmarkRouteRunRecord({
    route,
    variantId: runtimeState.variantId,
    variantName: runtimeState.variantMeta?.name ?? runtimeState.variantId,
    suiteId,
    renderScalePercent,
    longTaskStartIndex: longTaskBuffer.length,
    resourceStartIndex: performance.getEntriesByType('resource').length
  });
  runtimeState.routePlayback = {
    route,
    onFinish,
    stepIndex: -1,
    stepRemaining: 0
  };
}

export function finalizeRuntimeRouteRunRecord({
  runtimeState,
  status,
  longTaskBuffer,
  routeRunHistory,
  maxRouteRunHistory,
  routeRunHistoryStorageKey,
  persistRouteRunHistory,
  publishRouteDiagnostics,
  getRouteStepLabel
}: FinalizeRuntimeRouteRunRecordArgs) {
  const record = runtimeState?.routeRecord;
  if (!record) {
    return null;
  }

  const finalizedRecord = finalizeBenchmarkRouteRunRecord({
    record,
    benchmark: runtimeState.benchmark,
    status,
    longTaskBuffer,
    getRouteStepLabel
  });

  routeRunHistory.unshift(finalizedRecord);
  routeRunHistory.length = Math.min(routeRunHistory.length, maxRouteRunHistory);
  persistRouteRunHistory(routeRunHistoryStorageKey, routeRunHistory);
  publishRouteDiagnostics();
  runtimeState.routeRecord = null;
  return finalizedRecord;
}

export function stopRuntimeBenchmarkRoute({
  runtimeState,
  status = 'aborted',
  finalizeRouteRunRecord
}: StopRuntimeBenchmarkRouteArgs) {
  if (!runtimeState) {
    return;
  }

  const playback = runtimeState.routePlayback;
  const finalizedRecord = finalizeRouteRunRecord(runtimeState, status);
  runtimeState.routePlayback = null;
  playback?.onFinish?.(finalizedRecord);
}

export function advanceRuntimeBenchmarkRoute({
  runtimeState,
  pc,
  vec3,
  activeRouteId,
  onActiveRouteCompleted,
  stopRuntimeBenchmarkRoute,
  updateRouteSummary
}: AdvanceRuntimeBenchmarkRouteArgs) {
  const playback = runtimeState?.routePlayback;

  if (!playback) {
    return false;
  }

  playback.stepIndex += 1;
  if (playback.stepIndex >= playback.route.steps.length) {
    if (activeRouteId === playback.route.id) {
      onActiveRouteCompleted(`${playback.route.name} · 完成`, 'completed');
    } else {
      stopRuntimeBenchmarkRoute(runtimeState, 'completed');
    }
    return false;
  }

  const step = playback.route.steps[playback.stepIndex];
  const duration = Number.isFinite(step.duration) ? Math.max(step.duration, 0) : 1.35;
  const hold = Number.isFinite(step.hold) ? Math.max(step.hold, 0) : 0.35;
  moveRuntimeCamera({
    runtimeState,
    preset: step,
    pc,
    vec3,
    immediate: duration === 0,
    duration
  });
  playback.stepRemaining = duration + hold;

  if (activeRouteId === playback.route.id) {
    updateRouteSummary(
      `${playback.route.name} · ${playback.stepIndex + 1}/${playback.route.steps.length}`
    );
  }

  return true;
}

export function updateRuntimeBenchmarkRoute({
  runtimeState,
  dt,
  advanceRuntimeBenchmarkRoute
}: UpdateRuntimeBenchmarkRouteArgs) {
  const playback = runtimeState?.routePlayback;

  if (!playback) {
    return false;
  }

  playback.stepRemaining -= dt;
  if (playback.stepRemaining > 0) {
    return false;
  }

  return advanceRuntimeBenchmarkRoute();
}

export function captureRuntimeView(runtimeState: BenchmarkRuntimeState | null | undefined) {
  return captureOrbitView(runtimeState?.orbit);
}

export function restoreRuntimeView({
  runtimeState,
  snapshot,
  pc
}: RestoreRuntimeViewArgs) {
  if (!restoreOrbitView(runtimeState?.orbit, snapshot, pc)) {
    return false;
  }

  runtimeState?.requestRender?.();
  return true;
}
