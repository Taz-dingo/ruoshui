import { useViewerUiStore } from '../ui/viewer-ui-store';

export function CameraPanel() {
  const state = useViewerUiStore((store) => store.camera);

  return (
    <section className="inspector-section" data-panel="camera">
      <button className="inspector-toggle" type="button" data-toggle="camera" aria-expanded="false">
        <span className="section-title">相机信息</span>
        <span className="toggle-meta">{state.summary}</span>
      </button>
      <div className="inspector-body" data-body="camera">
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
