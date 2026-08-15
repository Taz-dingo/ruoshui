import { cn } from '../../utils/cn';
import { useViewerUiStore } from '../../ui/state/viewer-ui-store';

function LoadingOverlay() {
  const blockingError = useViewerUiStore((store) => store.blockingError);
  const loading = useViewerUiStore((store) => store.loading);
  const sceneMeta = useViewerUiStore((store) => store.sceneMeta);
  const isError = Boolean(blockingError);
  const modeLabel = loading.mode === 'boot' ? '正在进入' : '正在切换';
  const modeMeta = loading.mode === 'boot' ? '请稍候' : '准备下一版';
  const shouldShow = loading.visible || isError;

  return (
    <div
      aria-hidden={!shouldShow}
      className={cn(
        'pointer-events-none absolute inset-0 z-[5] opacity-0 transition-opacity duration-300 ease-out',
        shouldShow && 'opacity-100',
        shouldShow && (isError || loading.mode === 'boot') && 'pointer-events-auto'
      )}
      data-mode={loading.mode}
    >
      <div
        className={cn(
          'absolute inset-0 backdrop-blur-[14px]',
          isError
            ? 'bg-[radial-gradient(circle_at_18%_18%,rgba(227,158,158,0.18),transparent_24%),radial-gradient(circle_at_78%_78%,rgba(145,103,74,0.16),transparent_26%),linear-gradient(135deg,rgba(24,16,15,0.94)_0%,rgba(29,18,18,0.82)_48%,rgba(27,17,17,0.9)_100%)]'
            : loading.mode === 'switch'
            ? 'bg-[radial-gradient(circle_at_22%_24%,rgba(150,214,255,0.12),transparent_24%),radial-gradient(circle_at_78%_78%,rgba(82,126,189,0.12),transparent_26%),linear-gradient(135deg,rgba(10,22,38,0.66)_0%,rgba(11,25,44,0.36)_48%,rgba(9,18,31,0.58)_100%)] backdrop-blur-[10px]'
            : 'bg-[radial-gradient(circle_at_22%_24%,rgba(150,214,255,0.18),transparent_24%),radial-gradient(circle_at_78%_78%,rgba(82,126,189,0.18),transparent_26%),linear-gradient(135deg,rgba(12,25,44,0.9)_0%,rgba(13,31,53,0.68)_48%,rgba(9,18,31,0.84)_100%)] backdrop-blur-[14px]'
        )}
      />
      <div className="absolute bottom-6 left-6 right-6 max-w-[460px]">
        <span className="block text-[11px] uppercase tracking-[0.22em] text-brand-strong/78">若水广场</span>
        <div className="relative mb-4 mt-5 h-24 w-24" aria-hidden="true">
          <span className="absolute inset-0 rounded-full border border-ink/12 animate-[ruoshui-loading-breathe_2.4s_ease-in-out_infinite]" />
          <span className="absolute inset-[14%] rounded-full border border-brand-strong/20 animate-[ruoshui-loading-breathe_1.9s_ease-in-out_infinite_reverse]" />
          <span className="absolute inset-[28%] rounded-full border border-ink-muted/22 animate-[ruoshui-loading-breathe_1.5s_ease-in-out_infinite]" />
          {isError ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full border border-[rgba(241,201,193,0.28)] bg-[rgba(95,45,39,0.58)] px-4 py-3 text-[32px] leading-none text-[#f1c9c1] shadow-[0_0_24px_rgba(95,45,39,0.25)]">
                !
              </span>
            </span>
          ) : (
            <>
              <span className="absolute inset-0 animate-[ruoshui-loading-spin_2.2s_linear_infinite]">
              <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-brand-strong/92 shadow-[0_0_16px_rgba(199,227,158,0.42)]" />
              </span>
              <span className="absolute inset-0 animate-[ruoshui-loading-spin_3.3s_linear_infinite_reverse]">
                <span className="absolute bottom-[6%] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-ink/82 shadow-[0_0_14px_rgba(244,236,222,0.26)]" />
              </span>
              <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(199,227,158,0.95)_0%,rgba(199,227,158,0.38)_46%,rgba(199,227,158,0)_100%)] shadow-[0_0_24px_rgba(199,227,158,0.2)]" />
            </>
          )}
        </div>
        <h2 className="mb-0 mt-0 text-[clamp(26px,3.6vw,38px)] leading-[0.96] tracking-[-0.05em] text-balance">
          {blockingError?.title ?? modeLabel}
        </h2>
        {blockingError ? (
          <>
            <p className="mt-3 text-sm leading-[1.65] text-[#f6ddd8]">
              {blockingError.detail}
            </p>
            <p className="mt-3 rounded-[18px] border border-[rgba(241,201,193,0.16)] bg-[rgba(52,29,27,0.46)] px-4 py-3 text-ui-sm leading-[1.55] text-[#f0d9d4]">
              {blockingError.recoveryHint}
            </p>
          </>
        ) : (
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-muted/58 [&>span]:inline-flex [&>span]:items-center [&>span]:gap-2 [&>span:not(:last-child)]:after:inline-block [&>span:not(:last-child)]:after:h-1 [&>span:not(:last-child)]:after:w-1 [&>span:not(:last-child)]:after:rounded-full [&>span:not(:last-child)]:after:bg-ink-muted/28 [&>span:not(:last-child)]:after:content-['']">
            <span>{modeMeta}</span>
            {sceneMeta.title !== '—' ? <span>{sceneMeta.title}</span> : null}
          </div>
        )}
      </div>
    </div>
  );
}

export {
  LoadingOverlay
};
