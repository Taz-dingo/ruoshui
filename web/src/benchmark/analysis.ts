import { frameSampleIndices, severeStallFrameThresholdMs, stallFrameThresholdMs } from '../config';
import type {
  FrameSample,
  FrameStats,
  LongTaskEntry,
  ModelResourceEntry,
  RouteAnalysis,
  RouteRunRecord,
  StallWindow,
  StepStats
} from '../types';
import { computeQuantile, rangesOverlap, roundNumber } from '../utils/math';

export function analyzeRouteRun(
  record: Pick<RouteRunRecord, 'frames' | 'routeId'>,
  longTasks: LongTaskEntry[],
  modelResources: ModelResourceEntry[],
  getRouteStepLabel: (routeId: string, stepIndex: number) => string
): RouteAnalysis {
  const frames = record.frames ?? [];
  const frameTimes = frames.map((frame) => frame[frameSampleIndices.dtMs]);
  const frameStats = summarizeFrameTimes(frameTimes);
  const stepStats = summarizeFrameSteps(frames, record.routeId, getRouteStepLabel);
  const stallWindows = detectStallWindows(frames, longTasks, modelResources, record.routeId, getRouteStepLabel);

  return {
    frameStats,
    stepStats,
    stallCount: stallWindows.length,
    severeStallCount: stallWindows.filter((stall) => (stall.peakMs ?? 0) >= severeStallFrameThresholdMs).length,
    totalStallMs: Number(stallWindows.reduce((sum, stall) => sum + (stall.durationMs ?? 0), 0).toFixed(2)),
    hotspots: stallWindows.slice(0, 5)
  };
}

export function isTrackedModelResource(name: string): boolean {
  return name.includes('/models/');
}

export function simplifyResourceName(name: string): string {
  try {
    const url = new URL(name, window.location.href);
    return url.pathname;
  } catch {
    return name;
  }
}

export function getWorstStep(stepStats: StepStats[] | null | undefined): StepStats | null {
  if (!Array.isArray(stepStats) || stepStats.length === 0) {
    return null;
  }

  return [...stepStats].sort((left, right) => {
    const p95Diff = (right.p95Ms ?? -Infinity) - (left.p95Ms ?? -Infinity);
    if (p95Diff !== 0) {
      return p95Diff;
    }

    return (right.peakMs ?? -Infinity) - (left.peakMs ?? -Infinity);
  })[0];
}

export function formatWorstStepLabel(stepStats: StepStats[] | null | undefined): string {
  return getWorstStep(stepStats)?.label ?? '—';
}

export function formatHotspotResourceSummary(resources: ModelResourceEntry[] | null | undefined): string {
  if (!Array.isArray(resources) || resources.length === 0) {
    return '';
  }

  return `资源 ${resources.map((resource) => resource.name).join(' · ')}`;
}

function summarizeFrameTimes(frameTimes: number[]): FrameStats {
  if (frameTimes.length === 0) {
    return {
      sampleCount: 0,
      avgMs: null,
      p95Ms: null,
      p99Ms: null,
      peakMs: null
    };
  }

  return {
    sampleCount: frameTimes.length,
    avgMs: roundNumber(frameTimes.reduce((sum, value) => sum + value, 0) / frameTimes.length),
    p95Ms: roundNumber(computeQuantile(frameTimes, 0.95) ?? Number.NaN),
    p99Ms: roundNumber(computeQuantile(frameTimes, 0.99) ?? Number.NaN),
    peakMs: roundNumber(Math.max(...frameTimes))
  };
}

function summarizeFrameSteps(
  frames: FrameSample[],
  routeId: string,
  getRouteStepLabel: (routeId: string, stepIndex: number) => string
): StepStats[] {
  const grouped = new Map<number, number[]>();

  for (const frame of frames) {
    const stepIndex = frame[frameSampleIndices.stepIndex];
    if (!grouped.has(stepIndex)) {
      grouped.set(stepIndex, []);
    }

    grouped.get(stepIndex)?.push(frame[frameSampleIndices.dtMs]);
  }

  return [...grouped.entries()].map(([stepIndex, values]) => ({
    stepIndex,
    label: getRouteStepLabel(routeId, stepIndex),
    avgMs: roundNumber(values.reduce((sum, value) => sum + value, 0) / values.length),
    p95Ms: roundNumber(computeQuantile(values, 0.95) ?? Number.NaN),
    peakMs: roundNumber(Math.max(...values)),
    sampleCount: values.length
  }));
}

function detectStallWindows(
  frames: FrameSample[],
  longTasks: LongTaskEntry[],
  modelResources: ModelResourceEntry[],
  routeId: string,
  getRouteStepLabel: (routeId: string, stepIndex: number) => string
): StallWindow[] {
  const windows: Array<{
    startMs: number;
    endMs: number;
    frames: FrameSample[];
    peakFrame: FrameSample;
  }> = [];
  let activeWindow: {
    startMs: number;
    endMs: number;
    frames: FrameSample[];
    peakFrame: FrameSample;
  } | null = null;

  for (const frame of frames) {
    const dtMs = frame[frameSampleIndices.dtMs];
    if (dtMs <= stallFrameThresholdMs) {
      if (activeWindow) {
        windows.push(activeWindow);
        activeWindow = null;
      }
      continue;
    }

    if (!activeWindow) {
      activeWindow = {
        startMs: frame[frameSampleIndices.elapsedMs],
        endMs: frame[frameSampleIndices.elapsedMs] + dtMs,
        frames: [frame],
        peakFrame: frame
      };
      continue;
    }

    activeWindow.endMs = frame[frameSampleIndices.elapsedMs] + dtMs;
    activeWindow.frames.push(frame);
    if (dtMs > activeWindow.peakFrame[frameSampleIndices.dtMs]) {
      activeWindow.peakFrame = frame;
    }
  }

  if (activeWindow) {
    windows.push(activeWindow);
  }

  return windows
    .map((window) => finalizeStallWindow(window, longTasks, modelResources, routeId, getRouteStepLabel))
    .sort((left, right) => (right.peakMs ?? 0) - (left.peakMs ?? 0));
}

function finalizeStallWindow(
  window: {
    startMs: number;
    endMs: number;
    frames: FrameSample[];
    peakFrame: FrameSample;
  },
  longTasks: LongTaskEntry[],
  modelResources: ModelResourceEntry[],
  routeId: string,
  getRouteStepLabel: (routeId: string, stepIndex: number) => string
): StallWindow {
  const frameTimes = window.frames.map((frame) => frame[frameSampleIndices.dtMs]);
  const peakFrame = window.peakFrame;
  const overlappingLongTasks = longTasks.filter((task) =>
    rangesOverlap(task.startMs, task.startMs + task.durationMs, window.startMs, window.endMs)
  );
  const nearbyResources = modelResources.filter((resource) =>
    rangesOverlap(resource.startMs, resource.startMs + resource.durationMs, window.startMs - 150, window.endMs + 150)
  );

  return {
    startMs: roundNumber(window.startMs),
    endMs: roundNumber(window.endMs),
    durationMs: roundNumber(window.endMs - window.startMs),
    frameCount: window.frames.length,
    avgMs: roundNumber(frameTimes.reduce((sum, value) => sum + value, 0) / frameTimes.length),
    peakMs: roundNumber(Math.max(...frameTimes)),
    stepIndex: peakFrame[frameSampleIndices.stepIndex],
    stepLabel: getRouteStepLabel(routeId, peakFrame[frameSampleIndices.stepIndex]),
    camera: {
      position: [
        peakFrame[frameSampleIndices.posX],
        peakFrame[frameSampleIndices.posY],
        peakFrame[frameSampleIndices.posZ]
      ],
      target: [
        peakFrame[frameSampleIndices.targetX],
        peakFrame[frameSampleIndices.targetY],
        peakFrame[frameSampleIndices.targetZ]
      ],
      distance: peakFrame[frameSampleIndices.distance],
      pitch: peakFrame[frameSampleIndices.pitch],
      yaw: peakFrame[frameSampleIndices.yaw]
    },
    longTaskCount: overlappingLongTasks.length,
    longTaskMs: roundNumber(overlappingLongTasks.reduce((sum, task) => sum + task.durationMs, 0)),
    modelResourceCount: nearbyResources.length,
    likelyCause: inferStallCause(overlappingLongTasks, nearbyResources, peakFrame[frameSampleIndices.dtMs]),
    resources: nearbyResources.slice(0, 4)
  };
}

function inferStallCause(
  longTasks: LongTaskEntry[],
  modelResources: ModelResourceEntry[],
  peakMs: number
): string {
  if (longTasks.length > 0) {
    return '主线程长任务';
  }

  if (modelResources.length > 0) {
    return '模型资源加载 / LOD 补载';
  }

  if (peakMs >= severeStallFrameThresholdMs) {
    return '视角相关排序 / GPU 峰值';
  }

  return '相机变化期的渲染波动';
}
