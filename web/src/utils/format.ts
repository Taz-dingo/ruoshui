import type { VariantBenchmark } from '../benchmark/types';
import type { Vector3Like } from '../runtime/types';

export function formatMetricMs(value: number | null | undefined): string {
  if (!Number.isFinite(value)) {
    return '—';
  }

  return `${Math.round(value)} ms`;
}

export function formatMetricText(value: number | null | undefined): string {
  if (!Number.isFinite(value)) {
    return '—';
  }

  return `${Number(value).toFixed(1)} ms`;
}

export function formatMetricPeakMs(value: number | null | undefined): string {
  if (!Number.isFinite(value)) {
    return '—';
  }

  return `${Math.round(value)} ms`;
}

export function formatMotionMetric(benchmark: VariantBenchmark | null | undefined): string {
  if (!benchmark) {
    return '待采样';
  }

  const activeAverageMs = benchmark.wasMoving && benchmark.motionFrames >= 6 && benchmark.motionTime > 0
    ? (benchmark.motionTime / benchmark.motionFrames) * 1000
    : null;
  const averageMs = activeAverageMs ?? benchmark.lastMotionMs;

  if (!Number.isFinite(averageMs)) {
    return '待采样';
  }

  const maxMs = benchmark.wasMoving && Number.isFinite(benchmark.motionMaxMs)
    ? benchmark.motionMaxMs
    : benchmark.lastMotionMaxMs;

  if (!Number.isFinite(maxMs)) {
    return `${averageMs.toFixed(1)} ms`;
  }

  return `${averageMs.toFixed(1)} / ${maxMs.toFixed(0)} ms`;
}

export function formatRouteRunStatus(status: string): string {
  switch (status) {
    case 'completed':
      return '完成';
    case 'manual':
      return '手动';
    case 'switch':
      return '切换';
    default:
      return '中断';
  }
}

export function formatRouteRunTime(timestamp: number | null | undefined): string {
  if (!Number.isFinite(timestamp)) {
    return '—';
  }

  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function formatVec3(vector: Vector3Like): string {
  return `${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)}`;
}
