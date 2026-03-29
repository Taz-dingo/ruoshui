import { getLatestRouteAnalysisExport } from './history';
import type { RouteRunRecord } from './types';
import type { BenchmarkRoute, ViewerVariant } from '../content/types';

interface CreateRouteBenchmarkControllerArgs {
  benchmarkRoutes: BenchmarkRoute[];
  benchmarkRoutesById: Map<string, BenchmarkRoute>;
  variants: ViewerVariant[];
  variantsById: Map<string, ViewerVariant>;
  currentVariantRepeatCount: number;
  frameSchema: string[];
  routeRunHistory: RouteRunRecord[];
  getRuntime: () => any;
  getSelectedRouteId: () => string | null;
  setSelectedRouteId: (routeId: string | null) => void;
  getActiveRouteId: () => string | null;
  setActiveRouteId: (routeId: string | null) => void;
  getActiveVariantId: () => string;
  getIsBatchBenchmarkRunning: () => boolean;
  setIsBatchBenchmarkRunning: (isRunning: boolean) => void;
  setActiveSuiteRunId: (suiteId: string | null) => void;
  setActiveBenchmarkRunPromise: (promise: Promise<any> | null) => void;
  setRouteSummaryText: (summaryText: string) => void;
  setStatus: (title: string, detail: string) => void;
  publishRouteControls: () => void;
  updateRouteButtons: () => void;
  setVariantButtonsDisabled: (disabled: boolean) => void;
  activateVariant: (
    variantId: string,
    initial?: boolean,
    forceReload?: boolean
  ) => Promise<void>;
  startBenchmarkRoute: (runtimeState: any, route: BenchmarkRoute, options?: any) => void;
  stopActiveBenchmarkRoute: (summaryText?: string, status?: string) => void;
}

function createRouteBenchmarkController({
  benchmarkRoutes,
  benchmarkRoutesById,
  variants,
  variantsById,
  currentVariantRepeatCount,
  frameSchema,
  routeRunHistory,
  getRuntime,
  getSelectedRouteId,
  setSelectedRouteId,
  getActiveRouteId,
  setActiveRouteId,
  getActiveVariantId,
  getIsBatchBenchmarkRunning,
  setIsBatchBenchmarkRunning,
  setActiveSuiteRunId,
  setActiveBenchmarkRunPromise,
  setRouteSummaryText,
  setStatus,
  publishRouteControls,
  updateRouteButtons,
  setVariantButtonsDisabled,
  activateVariant,
  startBenchmarkRoute,
  stopActiveBenchmarkRoute
}: CreateRouteBenchmarkControllerArgs) {
  const activateBenchmarkRoute = (routeId: string) => {
    const route = benchmarkRoutesById.get(routeId);

    if (!route) {
      return;
    }

    setSelectedRouteId(route.id);
    if (getActiveRouteId() === routeId) {
      stopActiveBenchmarkRoute();
      return;
    }

    setActiveRouteId(route.id);
    setRouteSummaryText(`${route.name} · 运行中`);
    updateRouteButtons();

    const runtime = getRuntime();
    if (runtime) {
      startBenchmarkRoute(runtime, route);
    }
  };

  const playBenchmarkRouteOnce = (routeId: string) => {
    const route = benchmarkRoutesById.get(routeId);
    const runtime = getRuntime();

    if (!runtime || !route) {
      return Promise.reject(new Error('缺少可运行的轨迹或运行时'));
    }

    return new Promise<void>((resolve, reject) => {
      setSelectedRouteId(route.id);
      setActiveRouteId(route.id);
      setRouteSummaryText(`${route.name} · 运行中`);
      updateRouteButtons();
      publishRouteControls();
      startBenchmarkRoute(runtime, route, {
        onFinish: (record: any) => {
          if (!record || record.status !== 'completed') {
            reject(new Error(`${route.name} 未完整跑完`));
            return;
          }

          resolve(record);
        }
      });
    });
  };

  const runVariantRouteBenchmark = async (options: any = {}) => {
    const routeId = options.routeId ?? getSelectedRouteId() ?? benchmarkRoutes[0]?.id;
    const route = routeId ? benchmarkRoutesById.get(routeId) : null;
    const variantId = options.variantId ?? getActiveVariantId();
    const variant = variantsById.get(variantId);
    const repeatCount = Number.isFinite(options.repeatCount)
      ? Math.max(1, Math.floor(options.repeatCount))
      : currentVariantRepeatCount;
    const suitePrefix = options.suitePrefix ?? 'single';

    if (!route || !variant || getIsBatchBenchmarkRunning()) {
      return null;
    }

    const activeBenchmarkRunPromise = (async () => {
      setIsBatchBenchmarkRunning(true);
      publishRouteControls();
      setVariantButtonsDisabled(true);
      setStatus('单版本测试中', `${route.name} · ${variant.name}`);

      try {
        setActiveSuiteRunId(`${suitePrefix}-${Date.now()}`);
        for (let index = 0; index < repeatCount; index += 1) {
          setStatus(
            '单版本测试中',
            `${route.name} · ${variant.name} · 第 ${index + 1}/${repeatCount} 次`
          );
          await activateVariant(variant.id, false, true);
          await playBenchmarkRouteOnce(route.id);
        }
        setStatus(
          '单版本测试完成',
          `${route.name} · ${variant.name} 已记录 ${repeatCount} 次`
        );
        return getLatestRouteAnalysisExport(routeRunHistory, frameSchema);
      } catch (error) {
        setStatus(
          '单版本测试中断',
          error instanceof Error ? error.message : '未知错误'
        );
        throw error;
      } finally {
        setActiveSuiteRunId(null);
        setIsBatchBenchmarkRunning(false);
        setActiveBenchmarkRunPromise(null);
        publishRouteControls();
        setVariantButtonsDisabled(false);
        updateRouteButtons();
      }
    })();

    setActiveBenchmarkRunPromise(activeBenchmarkRunPromise);
    return activeBenchmarkRunPromise;
  };

  const runCurrentVariantRouteBenchmark = () =>
    runVariantRouteBenchmark({
      routeId: getSelectedRouteId() ?? benchmarkRoutes[0]?.id,
      variantId: getActiveVariantId(),
      repeatCount: currentVariantRepeatCount,
      suitePrefix: 'single'
    });

  const runRouteBenchmarkSuite = async () => {
    const routeId = getSelectedRouteId() ?? benchmarkRoutes[0]?.id;
    const route = routeId ? benchmarkRoutesById.get(routeId) : null;

    if (!route || getIsBatchBenchmarkRunning()) {
      return;
    }

    setIsBatchBenchmarkRunning(true);
    publishRouteControls();
    setVariantButtonsDisabled(true);
    setStatus('标准测试中', route.name);

    try {
      setActiveSuiteRunId(`suite-${Date.now()}`);
      for (let index = 0; index < variants.length; index += 1) {
        const variant = variants[index];
        setStatus(
          '标准测试中',
          `${route.name} · ${index + 1}/${variants.length} · ${variant.name}`
        );
        await activateVariant(variant.id, false, true);
        await playBenchmarkRouteOnce(route.id);
      }

      setStatus(
        '标准测试完成',
        `${route.name} · 已记录 ${variants.length} 个版本`
      );
    } catch (error) {
      setStatus(
        '标准测试中断',
        error instanceof Error ? error.message : '未知错误'
      );
      throw error;
    } finally {
      setActiveSuiteRunId(null);
      setIsBatchBenchmarkRunning(false);
      publishRouteControls();
      setVariantButtonsDisabled(false);
      updateRouteButtons();
    }
  };

  return {
    activateBenchmarkRoute,
    runCurrentVariantRouteBenchmark,
    runRouteBenchmarkSuite,
    runVariantRouteBenchmark
  };
}

export {
  createRouteBenchmarkController
};
