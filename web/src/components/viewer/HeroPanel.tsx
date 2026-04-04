import { useViewerUiStore } from '../../ui/state/viewer-ui-store';

interface HeroPanelProps {
  compact?: boolean;
  subtitle: string;
  title: string;
}

function HeroPanel({
  compact = false,
  subtitle,
  title
}: HeroPanelProps) {
  const status = useViewerUiStore((store) => store.status);

  return (
    <div className={`hero${compact ? ' is-compact' : ''}`}>
      {!compact ? (
        <div className="hero-topline">
          <span className="hero-status">{status.title}</span>
        </div>
      ) : null}
      <h1>{title}</h1>
      <p className="hero-subtitle">{subtitle}</p>
      {compact ? null : <p className="hero-note">{status.detail}</p>}
    </div>
  );
}

export {
  HeroPanel
};
