import { useViewerUiStore } from '../ui/viewer-ui-store';

function SceneMetaPanel() {
  const status = useViewerUiStore((store) => store.status);
  const sceneMeta = useViewerUiStore((store) => store.sceneMeta);
  const sceneMetrics = useViewerUiStore((store) => store.sceneMetrics);

  return (
    <div className="panel panel-reveal meta-panel">
      <div className="status-strip" aria-live="polite">
        <span className="status-dot" />
        <div className="status-copy">
          <strong>{status.title}</strong>
          <span>{status.detail}</span>
        </div>
      </div>
      <div className="stats compact-stats">
        <div className="stat-card">
          <span>当前版本</span>
          <strong>{sceneMeta.title}</strong>
        </div>
        <div className="stat-card">
          <span>文件体积</span>
          <strong>{sceneMeta.size}</strong>
        </div>
        <div className="stat-card">
          <span>高斯数量</span>
          <strong>{sceneMeta.splats}</strong>
        </div>
        <div className="stat-card">
          <span>保留比例</span>
          <strong>{sceneMeta.retention}</strong>
        </div>
      </div>
      <p className="memory-body">{sceneMeta.note}</p>
      <div className="metrics-grid" aria-live="polite">
        <div className="metric-card">
          <span>加载</span>
          <strong>{sceneMetrics.load}</strong>
        </div>
        <div className="metric-card">
          <span>首帧</span>
          <strong>{sceneMetrics.firstFrame}</strong>
        </div>
        <div className="metric-card">
          <span>漫游</span>
          <strong>{sceneMetrics.motion}</strong>
        </div>
      </div>
    </div>
  );
}

export {
  SceneMetaPanel
};
