import { useEffect, useState } from 'react';

import { useViewerUiStore } from '../../ui/state/viewer-ui-store';
import {
  requestAntiAliasChange,
  requestGraphicsBackendPreferenceChange,
  requestRenderScaleChange
} from '../../ui/commands/viewer-command-bus';
import type { GraphicsBackendPreference } from '../../runtime/bootstrap';
import { InspectorSection } from '../ui/inspector-section';

interface RenderScaleSectionProps {
  activeRenderScalePercent: number;
  graphicsBackendPreference: GraphicsBackendPreference;
  isOpen: boolean;
  maxRenderScalePercent: number;
  onToggle: () => void;
  renderScaleMinPercent: number;
  showAdvancedControls: boolean;
}

function RenderScaleSection({
  activeRenderScalePercent,
  graphicsBackendPreference,
  isOpen,
  maxRenderScalePercent,
  onToggle,
  renderScaleMinPercent,
  showAdvancedControls
}: RenderScaleSectionProps) {
  const renderScale = useViewerUiStore((store) => store.renderScale);
  const perfHud = useViewerUiStore((store) => store.perfHud);
  const [draftPercent, setDraftPercent] = useState(activeRenderScalePercent);

  useEffect(() => {
    const nextPercent = Number.parseInt(renderScale.summary, 10);
    if (Number.isFinite(nextPercent)) {
      setDraftPercent(nextPercent);
      return;
    }

    setDraftPercent(activeRenderScalePercent);
  }, [activeRenderScalePercent, renderScale.summary]);

  return (
    <InspectorSection
      isOpen={isOpen}
      onToggle={onToggle}
      panelId="quality"
      summary={renderScale.summary}
      title="渲染清晰度"
    >
        <div className="quality-control">
          <input
            className="quality-slider"
            type="range"
            min={renderScaleMinPercent}
            max={maxRenderScalePercent}
            step="1"
            value={draftPercent}
            onChange={(event) => {
              const nextPercent = Number(event.currentTarget.value);
              setDraftPercent(nextPercent);
              requestRenderScaleChange(nextPercent);
            }}
          />
          <div className="quality-meta">
            <strong>{renderScale.value}</strong>
            <span>{renderScale.note}</span>
          </div>
          {showAdvancedControls ? (
            <>
              <label className="quality-toggle">
                <span>
                  <strong>图形后端</strong>
                  <small>当前 {perfHud.backend} · 切换后自动重载</small>
                </span>
                <select
                  className="quality-select"
                  value={graphicsBackendPreference}
                  onChange={(event) =>
                    requestGraphicsBackendPreferenceChange(
                      event.currentTarget.value as GraphicsBackendPreference
                    )
                  }
                >
                  <option value="auto">自动</option>
                  <option value="webgpu">WebGPU</option>
                  <option value="webgl2">WebGL2</option>
                </select>
              </label>
              <label className="quality-toggle">
                <span>
                  <strong>后处理抗锯齿</strong>
                  <small>{renderScale.antiAliasSummary} · {renderScale.antiAliasNote}</small>
                </span>
                <input
                  type="checkbox"
                  checked={renderScale.antiAliasEnabled}
                  disabled={!renderScale.antiAliasAvailable}
                  onChange={(event) => {
                    requestAntiAliasChange(event.currentTarget.checked);
                  }}
                />
              </label>
            </>
          ) : null}
        </div>
    </InspectorSection>
  );
}

export {
  RenderScaleSection
};
