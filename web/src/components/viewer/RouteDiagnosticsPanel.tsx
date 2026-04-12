import {
  emptyRouteDiagnosticsState,
  useViewerUiStore
} from '../../ui/state/viewer-ui-store';
import {
  requestCopyRouteAnalysisJson,
  requestCopyRouteAnalysisSummary,
  requestDownloadRouteAnalysisJson
} from '../../ui/commands/viewer-command-bus';
import { cn } from '../../utils/cn';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

function resolveStatusVariant(status: string) {
  if (status === 'completed') {
    return 'success';
  }

  if (status === 'manual' || status === 'switch' || status === 'aborted') {
    return 'muted';
  }

  return 'default';
}

function RouteDiagnosticsPanel() {
  const state = useViewerUiStore((store) => store.routeDiagnostics ?? emptyRouteDiagnosticsState);
  const labelClassName = 'text-[10px] uppercase tracking-[0.04em] text-ink-muted/58';
  const valueClassName = 'text-[11px] font-semibold max-[760px]:text-[var(--type-mobile-title)] max-[760px]:leading-[1.28]';
  const metaClassName = 'text-[10px] leading-[1.45] text-ink-muted/72 max-[760px]:text-[var(--type-mobile-meta)]';
  const cardClassName = 'rounded-xl border border-ink-muted/8 bg-ink/[0.025] px-2.5 py-2.5';

  return (
    <>
      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className={labelClassName}>自动记录</span>
          <strong className={valueClassName}>{state.logSummary}</strong>
        </div>
        {state.logEmptyText ? (
          <div className="grid gap-2">
            <div className={cn(cardClassName, 'leading-[1.5] text-ink-muted/72')}>{state.logEmptyText}</div>
          </div>
        ) : (
          <div className="grid gap-2">
            {state.logItems.map((item) => (
              <article className={cardClassName} key={item.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <strong className="text-[11px] text-ink">{item.routeName}</strong>
                  <Badge variant={resolveStatusVariant(item.status)}>
                    {item.statusLabel}
                  </Badge>
                </div>
                <div className={metaClassName}>{item.meta}</div>
                <div className={cn(metaClassName, 'flex flex-wrap gap-x-3 gap-y-1')}>
                  <span>{item.motionText}</span>
                  <span>{item.firstFrameText}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className={labelClassName}>标准测试分析</span>
          <strong className={valueClassName}>{state.analysisSummary}</strong>
        </div>
        <div className="grid grid-cols-3 gap-2 max-[760px]:grid-cols-1">
          <Button
            className="w-full justify-center"
            onClick={() => requestCopyRouteAnalysisSummary()}
            variant="tertiary"
          >
            复制摘要
          </Button>
          <Button
            className="w-full justify-center"
            onClick={() => requestCopyRouteAnalysisJson()}
            variant="tertiary"
          >
            复制 JSON
          </Button>
          <Button
            className="w-full justify-center"
            onClick={() => requestDownloadRouteAnalysisJson()}
            variant="tertiary"
          >
            下载 JSON
          </Button>
        </div>
        <div className={metaClassName}>{state.copyNote}</div>

        {state.rankingEmptyText ? (
          <div className="grid gap-2">
            <div className={cn(cardClassName, 'leading-[1.5] text-ink-muted/72')}>{state.rankingEmptyText}</div>
          </div>
        ) : (
          <div className="grid gap-2">
            {state.rankingItems.map((item) => (
              <article className={cardClassName} key={item.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <strong className="text-[11px] text-ink">{item.variantName}</strong>
                  <span className="text-right text-[10px] leading-[1.4] text-brand-strong">{item.avgMs} / {item.peakMs} ms</span>
                </div>
                <div className={metaClassName}>P95 {item.p95Ms} · P99 {item.p99Ms} · 卡顿 {item.stallCount} 次</div>
                <div className={metaClassName}>最差段 {item.worstStepLabel} · P95 {item.worstStepP95Ms} · 峰值 {item.worstStepPeakMs}</div>
              </article>
            ))}
          </div>
        )}

        {state.hotspotEmptyText ? (
          <div className="grid gap-2">
            <div className={cn(cardClassName, 'leading-[1.5] text-ink-muted/72')}>{state.hotspotEmptyText}</div>
          </div>
        ) : (
          <div className="grid gap-2">
            {state.hotspotItems.map((item) => (
              <article className={cardClassName} key={item.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <strong className="text-[11px] text-ink">{item.variantName}</strong>
                  <span className="text-right text-[10px] leading-[1.4] text-brand-strong">{item.peakMs ?? '—'} ms</span>
                </div>
                <div className={metaClassName}>{item.stepLabel} · {item.likelyCause}</div>
                <div className={metaClassName}>窗口 {item.startMs}-{item.endMs} ms · 长任务 {item.longTaskCount} 次 / 资源 {item.modelResourceCount} 次</div>
                <div className={metaClassName}>视角 {item.cameraDistance}m · {item.cameraPitch}° / {item.cameraYaw}°</div>
                {item.resourceSummary ? <div className={metaClassName}>{item.resourceSummary}</div> : null}
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
