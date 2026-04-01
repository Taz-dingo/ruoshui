import { useViewerUiStore } from '../../ui/state/viewer-ui-store';

interface CameraPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

function CameraPanel({ isOpen, onToggle }: CameraPanelProps) {
  const state = useViewerUiStore((store) => store.camera);

  return (
    <section className="inspector-section" data-panel="camera">
      <button
        className={`inspector-toggle${isOpen ? ' is-active' : ''}`}
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
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

export {
  CameraPanel
};
