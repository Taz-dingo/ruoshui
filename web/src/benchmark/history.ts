import {
  formatHotspotResourceSummary,
  formatWorstStepLabel,
  getWorstStep
} from './analysis';
import type { RouteRunRecord } from '../types';
import { formatMetricText } from '../utils/format';

export function getLatestSuiteRecords(history: RouteRunRecord[]): RouteRunRecord[] {
  const latestSuiteId = history.find((entry) => entry.suiteId)?.suiteId;
  if (!latestSuiteId) {
    return [];
  }

  return history.filter((entry) => entry.suiteId === latestSuiteId);
}

export function buildRouteAnalysisSummary(records: RouteRunRecord[]) {
  const sorted = [...records].sort(
    (left, right) => (left.analysis?.frameStats?.avgMs ?? Infinity) - (right.analysis?.frameStats?.avgMs ?? Infinity)
  );
  const hotspots = records
    .flatMap((record) =>
      (record.analysis?.hotspots ?? []).map((hotspot) => ({
        ...hotspot,
        variantId: record.variantId,
        variantName: record.variantName,
        resourceSummary: formatHotspotResourceSummary(hotspot.resources)
      }))
    )
    .sort((left, right) => right.peakMs - left.peakMs)
    .slice(0, 5);

  return {
    suiteId: records[0]?.suiteId ?? 'manual',
    routeName: records[0]?.routeName ?? '未知轨迹',
    ranking: sorted.map((record) => ({
      variantId: record.variantId,
      variantName: record.variantName,
      avgMs: formatMetricText(record.analysis?.frameStats?.avgMs),
      p95Ms: formatMetricText(record.analysis?.frameStats?.p95Ms),
      p99Ms: formatMetricText(record.analysis?.frameStats?.p99Ms),
      peakMs: formatMetricText(record.analysis?.frameStats?.peakMs),
      stallCount: record.analysis?.stallCount ?? 0,
      worstStepLabel: formatWorstStepLabel(record.analysis?.stepStats),
      worstStepP95Ms: formatMetricText(getWorstStep(record.analysis?.stepStats)?.p95Ms),
      worstStepPeakMs: formatMetricText(getWorstStep(record.analysis?.stepStats)?.peakMs)
    })),
    hotspots
  };
}

export function formatRouteAnalysisSummaryText(
  summary: ReturnType<typeof buildRouteAnalysisSummary>,
  records: RouteRunRecord[]
) {
  const rankingLines = summary.ranking
    .map(
      (item, index) =>
        `${index + 1}. ${item.variantName}: avg ${item.avgMs}, p95 ${item.p95Ms}, peak ${item.peakMs}, stalls ${item.stallCount}, worst ${item.worstStepLabel} (${item.worstStepP95Ms})`
    )
    .join('\n');
  const hotspotLines = summary.hotspots.length > 0
    ? summary.hotspots
      .map(
        (hotspot, index) =>
          `${index + 1}. ${hotspot.variantName} / ${hotspot.stepLabel}: ${hotspot.peakMs} ms, ${hotspot.likelyCause}, 视角 ${hotspot.camera.distance}m ${hotspot.camera.pitch}°/${hotspot.camera.yaw}°, 资源 ${hotspot.modelResourceCount}, 长任务 ${hotspot.longTaskCount}`
      )
      .join('\n')
    : '无明显热点';

  return [
    `Suite: ${summary.suiteId}`,
    `Route: ${summary.routeName}`,
    '',
    'Ranking:',
    rankingLines,
    '',
    'Hotspots:',
    hotspotLines,
    '',
    `Records: ${records.length}`
  ].join('\n');
}

export function getLatestRouteAnalysisExport(
  history: RouteRunRecord[],
  frameSchema: string[]
) {
  const records = getLatestSuiteRecords(history);
  if (records.length === 0) {
    return null;
  }

  return {
    exportedAt: new Date().toISOString(),
    frameSchema,
    summary: buildRouteAnalysisSummary(records),
    records
  };
}

export function getInitialRouteRunHistory(
  storageKey: string,
  maxHistory: number
): RouteRunRecord[] {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.slice(0, maxHistory) : [];
  } catch {
    return [];
  }
}

export function persistRouteRunHistory(
  storageKey: string,
  history: RouteRunRecord[]
) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(history));
  } catch {
    return;
  }
}
