import {
  formatRouteAnalysisSummaryText,
  getLatestRouteAnalysisExport,
  persistRouteRunHistory
} from './history';
import { triggerFileDownload } from '../platform/file-download';
import { finalizeBenchmarkRouteRunRecord } from './runtime';
import { syncRouteDiagnosticsState } from '../ui/viewer-ui-sync';
import type { BenchmarkRoute, RouteRunRecord, ViewerVariant } from '../types';

interface RawLongTaskEntry {
  startTime: number;
  duration: number;
}

interface CreateRouteDiagnosticsControllerArgs {
  frameSchema: string[];
  copyFeedbackMs: number;
  maxRouteRunHistory: number;
  routeRunHistoryStorageKey: string;
  routeRunHistory: RouteRunRecord[];
  longTaskBuffer: RawLongTaskEntry[];
  benchmarkRoutes: BenchmarkRoute[];
  variants: ViewerVariant[];
  getRouteStepLabel: (routeId: string, stepIndex: number) => string;
  getActiveBenchmarkRunPromise: () => Promise<any> | null;
  runVariantRouteBenchmark: (options?: any) => Promise<any>;
}

function createRouteDiagnosticsController({
  frameSchema,
  copyFeedbackMs,
  maxRouteRunHistory,
  routeRunHistoryStorageKey,
  routeRunHistory,
  longTaskBuffer,
  benchmarkRoutes,
  variants,
  getRouteStepLabel,
  getActiveBenchmarkRunPromise,
  runVariantRouteBenchmark
}: CreateRouteDiagnosticsControllerArgs) {
  let routeAnalysisCopyTimeoutId: number | null = null;
  let routeAnalysisCopyNoteOverride: string | null = null;

  const publishRouteDiagnostics = () => {
    syncRouteDiagnosticsState({
      routeRunHistory,
      routeAnalysisCopyNoteOverride
    });
  };

  const setRouteAnalysisCopyNote = (text: string) => {
    routeAnalysisCopyNoteOverride = text;
    publishRouteDiagnostics();
    if (routeAnalysisCopyTimeoutId) {
      window.clearTimeout(routeAnalysisCopyTimeoutId);
    }

    routeAnalysisCopyTimeoutId = window.setTimeout(() => {
      routeAnalysisCopyNoteOverride = null;
      publishRouteDiagnostics();
      routeAnalysisCopyTimeoutId = null;
    }, copyFeedbackMs);
  };

  const copyLatestRouteAnalysis = async (mode: 'summary' | 'json') => {
    const exportPayload = getLatestRouteAnalysisExport(routeRunHistory, frameSchema);
    if (!exportPayload) {
      setRouteAnalysisCopyNote('还没有可导出的标准测试结果。');
      return;
    }

    const textPayload = mode === 'json'
      ? JSON.stringify(exportPayload, null, 2)
      : formatRouteAnalysisSummaryText(exportPayload.summary, exportPayload.records);

    try {
      await navigator.clipboard.writeText(textPayload);
      setRouteAnalysisCopyNote(mode === 'json' ? '已复制 JSON。' : '已复制摘要。');
    } catch {
      setRouteAnalysisCopyNote('复制失败，可能是浏览器权限限制。');
    }
  };

  const downloadLatestRouteAnalysisJson = () => {
    const exportPayload = getLatestRouteAnalysisExport(routeRunHistory, frameSchema);
    if (!exportPayload) {
      setRouteAnalysisCopyNote('还没有可导出的标准测试结果。');
      return;
    }

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json'
    });
    const routeSlug = exportPayload.summary.routeName
      .replace(/[^\p{Letter}\p{Number}-]+/gu, '-')
      .replace(/-+/g, '-');
    triggerFileDownload({
      blob,
      fileName: `ruoshui-route-analysis-${routeSlug}-${exportPayload.summary.suiteId}.json`
    });
    setRouteAnalysisCopyNote('已下载 JSON。');
  };

  const finalizeRouteRunRecord = (runtimeState: any, status: string) => {
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
  };

  const installRouteAnalysisBridge = () => {
    window.__ruoshuiPerf = {
      latest() {
        return getLatestRouteAnalysisExport(routeRunHistory, frameSchema);
      },
      history() {
        return routeRunHistory;
      },
      copySummary() {
        return copyLatestRouteAnalysis('summary');
      },
      copyJson() {
        return copyLatestRouteAnalysis('json');
      },
      clearHistory() {
        routeRunHistory.length = 0;
        persistRouteRunHistory(routeRunHistoryStorageKey, routeRunHistory);
        publishRouteDiagnostics();
      },
      variants() {
        return variants.map((variant) => ({ id: variant.id, name: variant.name }));
      },
      routes() {
        return benchmarkRoutes.map((route) => ({ id: route.id, name: route.name }));
      },
      async runVariantRoute(options: any = {}) {
        if (options.clearHistory) {
          this.clearHistory();
        }

        return runVariantRouteBenchmark({
          routeId: options.routeId,
          variantId: options.variantId,
          repeatCount: options.repeatCount,
          suitePrefix: options.suitePrefix ?? 'single'
        });
      },
      async waitForIdle() {
        const activeBenchmarkRunPromise = getActiveBenchmarkRunPromise();
        if (!activeBenchmarkRunPromise) {
          return null;
        }

        return activeBenchmarkRunPromise;
      }
    };
  };

  return {
    copyLatestRouteAnalysis,
    downloadLatestRouteAnalysisJson,
    finalizeRouteRunRecord,
    installRouteAnalysisBridge,
    publishRouteDiagnostics
  };
}

export {
  createRouteDiagnosticsController
};
