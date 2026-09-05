import type { SpatialAnchor } from '@ruoshui/shared';
import { useEffect, useState } from 'react';

import { requestSetHighlightAuthoringEnabled } from '../../ui/commands/viewer-command-bus';
import { useViewerUiStore } from '../../ui/state/viewer-ui-store';

interface SpatialAnchorEditorOverlayProps {
  onCancel: () => void;
  onSave: (anchor: SpatialAnchor) => void;
}

type AnchorEditorStep = 'point' | 'view';

function tupleToVector(value: [number, number, number]) {
  return { x: value[0], y: value[1], z: value[2] };
}

function clearCapturedPoint() {
  const store = useViewerUiStore.getState();
  store.setHighlightAuthoring({
    ...store.highlightAuthoring,
    point: '—',
    pointPosition: null,
    previewVisible: false,
    jsonSnippet: '',
    copyNote: '等待标记位置。',
  });
}

function SpatialAnchorEditorOverlay({
  onCancel,
  onSave,
}: SpatialAnchorEditorOverlayProps) {
  const [step, setStep] = useState<AnchorEditorStep>('point');
  const [isPickingPoint, setIsPickingPoint] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<[number, number, number] | null>(null);
  const livePoint = useViewerUiStore((store) => store.highlightAuthoring.pointPosition);
  const cameraPosition = useViewerUiStore((store) => store.camera.positionValue);
  const cameraTarget = useViewerUiStore((store) => store.camera.targetValue);

  useEffect(() => {
    requestSetHighlightAuthoringEnabled(false);
    clearCapturedPoint();
    return () => {
      requestSetHighlightAuthoringEnabled(false);
    };
  }, []);

  function handleCancel() {
    requestSetHighlightAuthoringEnabled(false);
    onCancel();
  }

  function beginPickingPoint() {
    clearCapturedPoint();
    setIsPickingPoint(true);
    requestSetHighlightAuthoringEnabled(true);
  }

  function handleContinue() {
    if (!livePoint) return;
    setMarkerPosition(livePoint);
    setIsPickingPoint(false);
    requestSetHighlightAuthoringEnabled(false);
    setStep('view');
  }

  function handleBackToPoint() {
    requestSetHighlightAuthoringEnabled(false);
    clearCapturedPoint();
    setIsPickingPoint(false);
    setStep('point');
  }

  function handleSave() {
    if (!markerPosition || !cameraPosition || !cameraTarget) return;
    requestSetHighlightAuthoringEnabled(false);
    onSave({
      markerPosition: tupleToVector(markerPosition),
      cameraPose: {
        position: tupleToVector(cameraPosition),
        target: tupleToVector(cameraTarget),
      },
    });
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[24] text-white">
      <div className="pointer-events-auto absolute left-[calc(1rem+var(--safe-left))] right-[calc(1rem+var(--safe-right))] top-[calc(1rem+var(--safe-top))] flex items-center justify-between gap-3">
        <button
          className="h-11 rounded-full border border-white/20 bg-black/55 px-4 text-[13px] font-medium text-white backdrop-blur-[18px]"
          onClick={step === 'point' ? handleCancel : handleBackToPoint}
          type="button"
        >
          {step === 'point' ? '返回故事' : '重新标位置'}
        </button>
        <div className="rounded-full border border-white/18 bg-black/52 px-4 py-2 text-center text-[12px] leading-[1.45] text-white/88 backdrop-blur-[18px]">
          {step === 'point' ? '1 / 2 · 标记故事发生的位置' : '2 / 2 · 保存回到这里的视角'}
        </div>
        <div className="w-[88px]" />
      </div>

      <div className="absolute bottom-[calc(1.25rem+var(--safe-bottom))] left-1/2 w-[min(520px,calc(100vw-2rem))] -translate-x-1/2">
        <div className="pointer-events-auto rounded-[24px] border border-white/18 bg-black/58 p-4 shadow-panel backdrop-blur-[22px]">
          {step === 'point' ? (
            <>
              <div className="text-[16px] font-semibold">
                {isPickingPoint ? '点一下故事发生的位置' : '先找到那个校园角落'}
              </div>
              <p className="mt-2 mb-4 text-[12px] leading-[1.65] text-white/62">
                {isPickingPoint
                  ? livePoint
                    ? '已经标好了。确认位置，或者重新点一次调整。'
                    : '现在单击场景完成标记；完成后会恢复正常的 3D 操作。'
                  : '现在可以正常旋转、平移和缩放。把那个角落移到容易点击的位置后，再开始标记。'}
              </p>
              {isPickingPoint && livePoint ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="h-11 rounded-full border border-white/18 bg-white/10 text-[13px] font-medium text-white"
                    onClick={beginPickingPoint}
                    type="button"
                  >
                    重新标记
                  </button>
                  <button
                    className="h-11 rounded-full bg-white text-[13px] font-semibold text-black"
                    onClick={handleContinue}
                    type="button"
                  >
                    位置就是这里 · 下一步
                  </button>
                </div>
              ) : (
                <button
                  className="h-11 w-full rounded-full bg-white text-[13px] font-semibold text-black"
                  onClick={beginPickingPoint}
                  type="button"
                >
                  {isPickingPoint ? '等待点击场景…' : '开始标记位置'}
                </button>
              )}
            </>
          ) : (
            <>
              <div className="text-[16px] font-semibold">把镜头调到你想留下的样子</div>
              <p className="mt-2 mb-4 text-[12px] leading-[1.65] text-white/62">
                现在可以继续正常旋转、平移和缩放。这个视角会成为别人从 Story “回到这里”时看到的镜头。
              </p>
              <button
                className="h-11 w-full rounded-full bg-white text-[13px] font-semibold text-black disabled:opacity-35"
                disabled={!cameraPosition || !cameraTarget}
                onClick={handleSave}
                type="button"
              >
                保存这个视角
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export { SpatialAnchorEditorOverlay };
