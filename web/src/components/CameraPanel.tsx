import { useViewerUiStore } from '../ui/viewer-ui-store';

export function CameraPanel() {
  const activeInspectorPanel = useViewerUiStore((store) => store.activeInspectorPanel);
  const setActiveInspectorPanel = useViewerUiStore((store) => store.setActiveInspectorPanel);
  const state = useViewerUiStore((store) => store.camera);
  const isOpen = activeInspectorPanel === 'camera';

  return (
    <section className="inspector-section" data-panel="camera">
      <button
        className={`inspector-toggle${isOpen ? ' is-active' : ''}`}
        type="button"
        aria-expanded={isOpen}
        onClick={() => setActiveInspectorPanel(isOpen ? null : 'camera')}
      >
        <span className="section-title">相机信息</span>
        <span className="toggle-meta">{state.summary}</span>
      </button>
      <div className={`inspector-body${isOpen ? ' is-open' : ''}`} data-body="camera">
        <div className="camera-grid">
          <div className="camera-card">
            <span>位置</span>
            <strong>{state.position}</strong>
          </div>
          <div className="camera-card">
            <span>目标</span>
            <strong>{state.target}</strong>
          </div>
          <div className="camera-card">
            <span>距离</span>
            <strong>{state.distance}</strong>
          </div>
          <div className="camera-card">
            <span>俯仰 / 水平</span>
            <strong>{state.angle}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
