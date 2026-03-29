import { useViewerUiStore } from '../ui/viewer-ui-store';

interface HeroPanelProps {
  subtitle: string;
  title: string;
  firstPresetId: string;
}

function HeroPanel({
  subtitle,
  title,
  firstPresetId
}: HeroPanelProps) {
  const requestPresetSelection = useViewerUiStore(
    (store) => store.requestPresetSelection
  );

  return (
    <div className="hero">
      <h1>{title}</h1>
      <p className="hero-subtitle">{subtitle}</p>
      <div className="hero-actions">
        <button
          className="button primary"
          type="button"
          onClick={() => requestPresetSelection(firstPresetId)}
        >
          进入
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() => requestPresetSelection('hover')}
        >
          全览
        </button>
      </div>
    </div>
  );
}

export {
  HeroPanel
};
