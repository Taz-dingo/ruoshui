import { useViewerUiStore } from '../../ui/state/viewer-ui-store';

function LoadingOverlay() {
  const loading = useViewerUiStore((store) => store.loading);
  const status = useViewerUiStore((store) => store.status);
  const sceneMeta = useViewerUiStore((store) => store.sceneMeta);

  return (
    <div
      aria-hidden={!loading.visible}
      className={`loading-overlay${loading.visible ? ' is-visible' : ''}`}
      data-mode={loading.mode}
    >
      <div className="loading-overlay-scrim" />
      <div className="loading-overlay-copy">
        <span className="loading-overlay-kicker">若水广场</span>
        <h2>{status.title}</h2>
        <p>{status.detail}</p>
        <div className="loading-overlay-track" aria-hidden="true">
          <span className="loading-overlay-track-fill" />
        </div>
        <div className="loading-overlay-meta">
          <span>
            {loading.mode === 'boot' ? '初次进入' : '版本切换'}
          </span>
          {sceneMeta.title !== '—' ? <span>{sceneMeta.title}</span> : null}
        </div>
      </div>
    </div>
  );
}

export {
  LoadingOverlay
};
