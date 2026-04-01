import { useViewerUiStore } from '../../ui/state/viewer-ui-store';

function LoadingOverlay() {
  const loading = useViewerUiStore((store) => store.loading);
  const sceneMeta = useViewerUiStore((store) => store.sceneMeta);
  const modeLabel = loading.mode === 'boot' ? '正在展开旧校区' : '正在切换场景版本';

  return (
    <div
      aria-hidden={!loading.visible}
      className={`loading-overlay${loading.visible ? ' is-visible' : ''}`}
      data-mode={loading.mode}
    >
      <div className="loading-overlay-scrim" />
      <div className="loading-overlay-copy">
        <span className="loading-overlay-kicker">若水广场</span>
        <div className="loading-overlay-graphic" aria-hidden="true">
          <span className="loading-ring loading-ring-outer" />
          <span className="loading-ring loading-ring-middle" />
          <span className="loading-ring loading-ring-inner" />
          <span className="loading-orbit loading-orbit-a">
            <span className="loading-orbit-dot" />
          </span>
          <span className="loading-orbit loading-orbit-b">
            <span className="loading-orbit-dot" />
          </span>
          <span className="loading-core" />
        </div>
        <h2>{modeLabel}</h2>
        <div className="loading-overlay-meta">
          <span>{loading.mode === 'boot' ? '初次进入' : '版本切换'}</span>
          {sceneMeta.title !== '—' ? <span>{sceneMeta.title}</span> : null}
        </div>
      </div>
    </div>
  );
}

export {
  LoadingOverlay
};
