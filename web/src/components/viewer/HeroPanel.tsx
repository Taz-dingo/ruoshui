import { useViewerUiStore } from '../../ui/state/viewer-ui-store';

interface HeroPanelProps {
  subtitle: string;
  title: string;
}

function HeroPanel({
  subtitle,
  title
}: HeroPanelProps) {
  const status = useViewerUiStore((store) => store.status);

  return (
    <div className="hero">
      <div className="hero-topline">
        <span className="hero-kicker">若水广场</span>
        <span className="hero-status">{status.title}</span>
      </div>
      <h1>{title}</h1>
      <p className="hero-subtitle">{subtitle}</p>
      <p className="hero-note">{status.detail}</p>
    </div>
  );
}

export {
  HeroPanel
};
