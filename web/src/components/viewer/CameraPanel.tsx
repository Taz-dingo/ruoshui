import { useViewerUiStore } from '../../ui/state/viewer-ui-store';
import { InspectorSection } from '../ui/inspector-section';

interface CameraPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

function CameraPanel({ isOpen, onToggle }: CameraPanelProps) {
  const state = useViewerUiStore((store) => store.camera);

  return (
    <InspectorSection
      isOpen={isOpen}
      onToggle={onToggle}
      panelId="camera"
      summary={state.summary}
      title="相机信息"
    >
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
    </InspectorSection>
  );
}

export {
  CameraPanel
};
