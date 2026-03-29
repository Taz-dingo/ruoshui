import {
  emptyRouteDiagnosticsState,
  useViewerUiStore
} from '../../ui/state/viewer-ui-store';
import {
  requestCopyRouteAnalysisJson,
  requestCopyRouteAnalysisSummary,
  requestDownloadRouteAnalysisJson
} from '../../ui/commands/viewer-command-bus';

function RouteDiagnosticsPanel() {
  const state = useViewerUiStore((store) => store.routeDiagnostics ?? emptyRouteDiagnosticsState);

  return (
    <>
      <div className="route-log">
        <div className="route-log-head">
          <span>自动记录</span>
          <strong>{state.logSummary}</strong>
        </div>
        {state.logEmptyText ? (
          <div className="route-log-list">
            <div className="route-log-empty">{state.logEmptyText}</div>
          </div>
        ) : (
          <div className="route-log-list">
            {state.logItems.map((item) => (
              <article className="route-log-item" key={item.id}>
                <div className="route-log-line">
                  <strong>{item.routeName}</strong>
                  <span className={`route-log-status is-${item.status}`}>{item.statusLabel}</span>
                </div>
                <div className="route-log-meta">{item.meta}</div>
                <div className="route-log-metrics">
                  <span>{item.motionText}</span>
                  <span>{item.firstFrameText}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="route-analysis">
        <div className="route-analysis-head">
          <span>标准测试分析</span>
          <strong>{state.analysisSummary}</strong>
        </div>
        <div className="route-analysis-actions">
          <button
            className="button tertiary route-analysis-button"
            type="button"
            onClick={() => requestCopyRouteAnalysisSummary()}
          >
            复制摘要
          </button>
          <button
            className="button tertiary route-analysis-button"
            type="button"
            onClick={() => requestCopyRouteAnalysisJson()}
          >
            复制 JSON
          </button>
          <button
            className="button tertiary route-analysis-button"
            type="button"
            onClick={() => requestDownloadRouteAnalysisJson()}
          >
            下载 JSON
          </button>
        </div>
        <div className="route-analysis-copy-note">{state.copyNote}</div>

        {state.rankingEmptyText ? (
          <div className="route-analysis-ranking">
            <div className="route-analysis-empty">{state.rankingEmptyText}</div>
          </div>
        ) : (
          <div className="route-analysis-ranking">
            {state.rankingItems.map((item) => (
              <article className="route-analysis-item" key={item.id}>
                <div className="route-analysis-line">
                  <strong>{item.variantName}</strong>
                  <span>{item.avgMs} / {item.peakMs} ms</span>
                </div>
                <div className="route-analysis-meta">P95 {item.p95Ms} · P99 {item.p99Ms} · 卡顿 {item.stallCount} 次</div>
                <div className="route-analysis-meta">最差段 {item.worstStepLabel} · P95 {item.worstStepP95Ms} · 峰值 {item.worstStepPeakMs}</div>
              </article>
            ))}
          </div>
        )}

        {state.hotspotEmptyText ? (
          <div className="route-analysis-hotspots">
            <div className="route-analysis-empty">{state.hotspotEmptyText}</div>
          </div>
        ) : (
          <div className="route-analysis-hotspots">
            {state.hotspotItems.map((item) => (
              <article className="route-hotspot-item" key={item.id}>
                <div className="route-analysis-line">
                  <strong>{item.variantName}</strong>
                  <span>{item.peakMs ?? '—'} ms</span>
                </div>
                <div className="route-analysis-meta">{item.stepLabel} · {item.likelyCause}</div>
                <div className="route-analysis-meta">窗口 {item.startMs}-{item.endMs} ms · 长任务 {item.longTaskCount} 次 / 资源 {item.modelResourceCount} 次</div>
                <div className="route-analysis-meta">视角 {item.cameraDistance}m · {item.cameraPitch}° / {item.cameraYaw}°</div>
                {item.resourceSummary ? <div className="route-analysis-meta">{item.resourceSummary}</div> : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export {
  RouteDiagnosticsPanel
};
