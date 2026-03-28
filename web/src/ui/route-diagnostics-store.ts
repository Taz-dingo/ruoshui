import type { RouteDiagnosticsViewState } from '../types';

const routeDiagnosticsEventName = 'ruoshui:route-diagnostics';

const emptyRouteDiagnosticsState: RouteDiagnosticsViewState = {
  logSummary: '暂无',
  logItems: [],
  logEmptyText: '跑一次轨迹后，这里会自动留下对比记录。',
  analysisSummary: '等待批量测试',
  copyNote: '跑完一轮标准测试后可复制。',
  rankingItems: [],
  rankingEmptyText: '运行“当前轨迹 × 全版本”后，这里会出现排行榜和卡顿热点。',
  hotspotItems: [],
  hotspotEmptyText: null
};

let routeDiagnosticsState = emptyRouteDiagnosticsState;

export function getRouteDiagnosticsState() {
  return routeDiagnosticsState;
}

export function publishRouteDiagnosticsState(state: RouteDiagnosticsViewState) {
  routeDiagnosticsState = state;
  window.dispatchEvent(new CustomEvent(routeDiagnosticsEventName, { detail: state }));
}

export function subscribeRouteDiagnosticsState(
  listener: (state: RouteDiagnosticsViewState) => void
) {
  const handleEvent = (event: Event) => {
    listener((event as CustomEvent<RouteDiagnosticsViewState>).detail);
  };

  window.addEventListener(routeDiagnosticsEventName, handleEvent);
  return () => {
    window.removeEventListener(routeDiagnosticsEventName, handleEvent);
  };
}

export function getEmptyRouteDiagnosticsState() {
  return emptyRouteDiagnosticsState;
}
