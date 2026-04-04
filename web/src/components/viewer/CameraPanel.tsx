import { useViewerUiStore } from '../../ui/state/viewer-ui-store';
import { InspectorSection } from '../ui/inspector-section';
import { InfoFieldCard } from '../ui/info-field-card';

interface CameraPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

function CameraPanel({ isOpen, onToggle }: CameraPanelProps) {
  const state = useViewerUiStore((store) => store.camera);
  const fields = [
    {
      id: 'position',
      label: '位置',
      value: state.position
    },
    {
      id: 'target',
      label: '目标',
      value: state.target
    },
    {
      id: 'distance',
      label: '距离',
      value: state.distance
    },
    {
      id: 'angle',
      label: '俯仰 / 水平',
      value: state.angle
    }
  ];

  return (
    <InspectorSection
      isOpen={isOpen}
      onToggle={onToggle}
      panelId="camera"
      summary={state.summary}
      title="相机信息"
    >
      <div className="camera-grid">
        {fields.map((field) => (
          <InfoFieldCard
            key={field.id}
            label={field.label}
            value={field.value}
          />
        ))}
      </div>
    </InspectorSection>
  );
}

export {
  CameraPanel
};
