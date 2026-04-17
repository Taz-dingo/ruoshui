import { cn } from '../../utils/cn';
import { useViewerUiStore } from '../../ui/state/viewer-ui-store';

interface CommunityStatus {
  detail: string;
  label: string;
  state: 'checking' | 'offline' | 'online';
}

interface HeroPanelProps {
  compact?: boolean;
  communityStatus?: CommunityStatus;
  subtitle: string;
  title: string;
}

function HeroPanel({
  compact = false,
  communityStatus,
  subtitle,
  title
}: HeroPanelProps) {
  const status = useViewerUiStore((store) => store.status);
  const communityStatusToneClassName =
    communityStatus?.state === 'online'
      ? 'border-[rgba(199,227,158,0.28)] bg-[rgba(43,58,33,0.28)] text-[#dceec1]'
      : communityStatus?.state === 'offline'
        ? 'border-[rgba(227,158,158,0.22)] bg-[rgba(64,36,32,0.38)] text-[#f1c9c1]'
        : 'border-[rgba(207,184,151,0.18)] bg-[rgba(52,42,35,0.34)] text-ink-muted/78';

  return (
    <div className="pointer-events-auto w-full max-w-none">
      <div className="relative max-w-[18rem] max-[760px]:max-w-[10.5rem]">
        <span
          aria-hidden="true"
          className="absolute bottom-1 top-1 left-[calc(var(--rail-content-pad)*-0.55)] w-px bg-[linear-gradient(180deg,rgba(199,227,158,0.82)_0%,rgba(207,184,151,0.24)_58%,rgba(207,184,151,0)_100%)] max-[760px]:left-[-10px]"
        />
        {!compact ? (
          <div className="mb-3 flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.18em] text-ink-muted/58 before:mr-2 before:inline-block before:h-1.5 before:w-1.5 before:rounded-full before:bg-brand/84 before:align-middle before:shadow-[0_0_12px_rgba(199,227,158,0.28)]">
              {status.title}
            </span>
            <span
              className="h-px min-w-[3.25rem] flex-1 bg-[linear-gradient(90deg,rgba(207,184,151,0.28)_0%,rgba(207,184,151,0.1)_62%,rgba(207,184,151,0)_100%)]"
              aria-hidden="true"
            />
          </div>
        ) : null}
        <h1
          className={cn(
            'm-0 text-[clamp(23px,2.8vw,33px)] leading-[0.98] tracking-[-0.055em] max-[760px]:text-[clamp(18px,6.2vw,24px)]',
            compact && 'text-[clamp(22px,2.4vw,29px)]'
          )}
        >
          {title}
        </h1>
        <p
          className={cn(
            'mt-2 max-w-[15.5rem] text-ui-sm leading-[1.6] text-ink-muted/72 text-balance max-[760px]:max-w-[10.5rem] max-[760px]:text-[10px] max-[760px]:leading-[1.45]',
            compact && 'mt-1.5 max-w-[14rem] text-ink-muted/64'
          )}
        >
          {subtitle}
        </p>
        {communityStatus ? (
          <div
            className={cn(
              'mt-3 max-w-[16.5rem] rounded-[18px] border px-3 py-2.5 backdrop-blur-[10px] max-[760px]:mt-2 max-[760px]:max-w-[10.5rem] max-[760px]:rounded-[16px] max-[760px]:px-2.5 max-[760px]:py-2',
              communityStatusToneClassName
            )}
          >
            <p className="m-0 text-[10px] uppercase tracking-[0.18em] opacity-82">
              社区底座
            </p>
            <p className="mt-1 text-ui-sm leading-[1.45]">
              {communityStatus.label}
            </p>
            <p className="mt-1 text-ui-xs leading-[1.5] opacity-80">
              {communityStatus.detail}
            </p>
          </div>
        ) : null}
        {compact ? null : (
          <p className="mt-3 max-w-[16.5rem] text-ui-xs leading-[1.55] text-ink-muted/72">
            {status.detail}
          </p>
        )}
      </div>
    </div>
  );
}

export {
  HeroPanel
};
