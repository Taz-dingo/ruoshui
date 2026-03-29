import { analyzeRouteRun, isTrackedModelResource, simplifyResourceName } from './analysis';
import type {
  LongTaskEntry,
  RouteRunRecord,
  VariantBenchmark
} from './types';
import type { BenchmarkRoute } from '../content/types';
import { radToDeg } from '../utils/math';

interface RawLongTaskEntry {
  startTime: number;
  duration: number;
}

interface CreateRouteRunRecordArgs {
  route: BenchmarkRoute;
  variantId: string;
  variantName: string;
  suiteId: string | null;
  renderScalePercent: number;
  longTaskStartIndex: number;
  resourceStartIndex: number;
}

interface RecordRouteFrameArgs {
  orbit: any;
  routeRecord: RouteRunRecord;
  stepIndex: number;
  dt: number;
}

interface FinalizeRouteRunRecordArgs {
  record: RouteRunRecord;
  benchmark: VariantBenchmark | null | undefined;
  status: string;
  longTaskBuffer: RawLongTaskEntry[];
  getRouteStepLabel: (routeId: string, stepIndex: number) => string;
}

export function initLongTaskObserver(buffer: RawLongTaskEntry[]) {
  if (typeof PerformanceObserver === 'undefined') {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        buffer.push({
          startTime: entry.startTime,
          duration: entry.duration
        });
      }
    });

    observer.observe({ type: 'longtask', buffered: true });
  } catch {
    return;
  }
}

export function createBenchmarkRouteRunRecord({
  route,
  variantId,
  variantName,
  suiteId,
  renderScalePercent,
  longTaskStartIndex,
  resourceStartIndex
}: CreateRouteRunRecordArgs): RouteRunRecord {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    suiteId,
    routeId: route.id,
    routeName: route.name,
    variantId,
    variantName,
    renderScalePercent,
    startedAt: Date.now(),
    startedPerfTime: performance.now(),
    longTaskStartIndex,
    resourceStartIndex,
    frames: [],
    lodWarmups: []
  };
}

export function recordBenchmarkRouteFrame({
  orbit,
  routeRecord,
  stepIndex,
  dt
}: RecordRouteFrameArgs) {
  const position = orbit.camera.getPosition();
  const target = orbit.currentTarget;
  routeRecord.frames.push([
    Number((performance.now() - routeRecord.startedPerfTime).toFixed(2)),
    Number((dt * 1000).toFixed(2)),
    stepIndex,
    Number(position.x.toFixed(3)),
    Number(position.y.toFixed(3)),
    Number(position.z.toFixed(3)),
    Number(target.x.toFixed(3)),
    Number(target.y.toFixed(3)),
    Number(target.z.toFixed(3)),
    Number(orbit.currentDistance.toFixed(3)),
    Math.round(radToDeg(orbit.currentPitch)),
    Math.round(radToDeg(orbit.currentYaw))
  ]);
}

export function finalizeBenchmarkRouteRunRecord({
  record,
  benchmark,
  status,
  longTaskBuffer,
  getRouteStepLabel
}: FinalizeRouteRunRecordArgs) {
  const finishedPerfTime = performance.now();
  const metrics = snapshotBenchmarkMetrics(benchmark);
  const longTasks = getRouteRunLongTasks(record, finishedPerfTime, longTaskBuffer);
  const modelResources = getRouteRunModelResources(record, finishedPerfTime);
  const analysis = analyzeRouteRun(record, longTasks, modelResources, getRouteStepLabel);

  return {
    ...record,
    status,
    finishedAt: Date.now(),
    loadMs: benchmark?.loadMs ?? null,
    firstFrameMs: benchmark?.firstFrameMs ?? null,
    motionAvgMs: metrics.averageMs,
    motionMaxMs: metrics.maxMs,
    analysis,
    trace: {
      frames: record.frames,
      longTasks,
      modelResources,
      lodWarmups: record.lodWarmups
    }
  };
}

export function beginStoredVariantBenchmark(
  store: Map<string, VariantBenchmark>,
  variantId: string
): VariantBenchmark {
  const benchmark: VariantBenchmark = {
    loadMs: null,
    firstFrameMs: null,
    motionTime: 0,
    motionFrames: 0,
    motionMaxMs: null,
    lastMotionMs: null,
    lastMotionMaxMs: null,
    wasMoving: false
  };
  store.set(variantId, benchmark);
  return benchmark;
}

export function getStoredVariantBenchmark(
  store: Map<string, VariantBenchmark>,
  variantId: string | null | undefined
): VariantBenchmark | null {
  if (!variantId) {
    return null;
  }

  if (!store.has(variantId)) {
    return beginStoredVariantBenchmark(store, variantId);
  }

  return store.get(variantId) ?? null;
}

export function beginMotionSession(benchmark: VariantBenchmark | null | undefined) {
  if (!benchmark) {
    return;
  }

  benchmark.motionTime = 0;
  benchmark.motionFrames = 0;
  benchmark.motionMaxMs = null;
  benchmark.wasMoving = true;
}

export function sampleMotionFrame(
  benchmark: VariantBenchmark | null | undefined,
  dt: number
) {
  if (!benchmark) {
    return;
  }

  if (!benchmark.wasMoving) {
    beginMotionSession(benchmark);
  }

  benchmark.motionFrames += 1;
  benchmark.motionTime += dt;
  const frameMs = dt * 1000;
  benchmark.motionMaxMs = benchmark.motionMaxMs === null
    ? frameMs
    : Math.max(benchmark.motionMaxMs, frameMs);
}

export function endMotionSession(benchmark: VariantBenchmark | null | undefined) {
  if (!benchmark?.wasMoving) {
    return false;
  }

  benchmark.wasMoving = false;
  if (benchmark.motionFrames > 0 && benchmark.motionTime > 0) {
    benchmark.lastMotionMs = (benchmark.motionTime / benchmark.motionFrames) * 1000;
    benchmark.lastMotionMaxMs = benchmark.motionMaxMs;
    return true;
  }

  return false;
}

export function trackBenchmarkFirstFrame(
  app: any,
  variantId: string,
  switchStartedAt: number,
  getBenchmark: (variantId: string) => VariantBenchmark | null,
  onFirstFrame: (variantId: string) => void
) {
  if (!Number.isFinite(switchStartedAt)) {
    return;
  }

  const resolveFirstFrame = () => {
    const benchmark = getBenchmark(variantId);
    if (!benchmark || Number.isFinite(benchmark.firstFrameMs)) {
      return;
    }

    benchmark.firstFrameMs = performance.now() - switchStartedAt;
    onFirstFrame(variantId);
  };

  app.once('frameend', resolveFirstFrame);
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(resolveFirstFrame);
  });
}

function snapshotBenchmarkMetrics(benchmark: VariantBenchmark | null | undefined) {
  if (!benchmark) {
    return {
      averageMs: null,
      maxMs: null
    };
  }

  const averageMs = benchmark.wasMoving && benchmark.motionFrames > 0 && benchmark.motionTime > 0
    ? (benchmark.motionTime / benchmark.motionFrames) * 1000
    : benchmark.lastMotionMs;
  const maxMs = benchmark.wasMoving && Number.isFinite(benchmark.motionMaxMs)
    ? benchmark.motionMaxMs
    : benchmark.lastMotionMaxMs;

  return {
    averageMs: Number.isFinite(averageMs) ? averageMs : null,
    maxMs: Number.isFinite(maxMs) ? maxMs : null
  };
}

function getRouteRunLongTasks(
  record: RouteRunRecord,
  finishedPerfTime: number,
  longTaskBuffer: RawLongTaskEntry[]
): LongTaskEntry[] {
  return longTaskBuffer
    .slice(record.longTaskStartIndex)
    .filter(
      (entry) =>
        entry.startTime <= finishedPerfTime &&
        entry.startTime + entry.duration >= record.startedPerfTime
    )
    .map((entry) => ({
      startMs: Number((entry.startTime - record.startedPerfTime).toFixed(2)),
      durationMs: Number(entry.duration.toFixed(2))
    }));
}

function getRouteRunModelResources(
  record: RouteRunRecord,
  finishedPerfTime: number
) {
  return (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
    .slice(record.resourceStartIndex)
    .filter((entry) => entry.startTime <= finishedPerfTime)
    .filter((entry) => isTrackedModelResource(entry.name))
    .map((entry) => ({
      name: simplifyResourceName(entry.name),
      startMs: Number((entry.startTime - record.startedPerfTime).toFixed(2)),
      durationMs: Number(entry.duration.toFixed(2)),
      transferSize: entry.transferSize ?? 0,
      encodedBodySize: entry.encodedBodySize ?? 0
    }));
}
