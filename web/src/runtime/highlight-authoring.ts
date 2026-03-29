import { minOrbitTargetY } from '../config';

interface CaptureHighlightDraftArgs {
  pc: any;
  runtimeState: any;
  clientX: number;
  clientY: number;
  planeY: number;
  presetId: string;
}

interface HighlightDraftResult {
  point: [number, number, number];
  pointText: string;
  note: string;
  jsonSnippet: string;
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(3));
}

function formatPoint(point: [number, number, number]) {
  return `${point[0].toFixed(3)}, ${point[1].toFixed(3)}, ${point[2].toFixed(3)}`;
}

function buildHighlightJsonSnippet(point: [number, number, number], presetId: string) {
  return JSON.stringify(
    {
      id: 'new-highlight',
      name: '新点位',
      title: '待补标题',
      body: '待补正文',
      presetId,
      position: point
    },
    null,
    2
  );
}

function captureHighlightDraft({
  pc,
  runtimeState,
  clientX,
  clientY,
  planeY,
  presetId
}: CaptureHighlightDraftArgs): HighlightDraftResult | null {
  const cameraEntity = runtimeState?.camera;
  const cameraComponent = cameraEntity?.camera;
  const orbit = runtimeState?.orbit;
  const canvasElement = runtimeState?.canvasElement;

  if (!cameraEntity || !cameraComponent || !orbit || !canvasElement) {
    return null;
  }

  const rect = canvasElement.getBoundingClientRect();
  const screenX = clientX - rect.left;
  const screenY = clientY - rect.top;

  if (
    screenX < 0 ||
    screenX > rect.width ||
    screenY < 0 ||
    screenY > rect.height
  ) {
    return null;
  }

  const normalizedPlaneY = Math.max(minOrbitTargetY, planeY);
  const rayStart = cameraComponent.screenToWorld(
    screenX,
    screenY,
    cameraComponent.nearClip,
    new pc.Vec3()
  );
  const rayEnd = cameraComponent.screenToWorld(
    screenX,
    screenY,
    cameraComponent.farClip,
    new pc.Vec3()
  );
  const rayDirection = new pc.Vec3().sub2(rayEnd, rayStart);

  let note = `按 y=${normalizedPlaneY.toFixed(2)} 平面估算`;
  let pointVec: any = null;

  if (Math.abs(rayDirection.y) > 1e-5) {
    const t = (normalizedPlaneY - rayStart.y) / rayDirection.y;
    if (Number.isFinite(t) && t > 0) {
      pointVec = new pc.Vec3(
        rayStart.x + rayDirection.x * t,
        normalizedPlaneY,
        rayStart.z + rayDirection.z * t
      );
    }
  }

  if (!pointVec) {
    pointVec = orbit.currentTarget.clone();
    pointVec.y = normalizedPlaneY;
    note = `射线与平面过于接近平行，已回退到当前目标高度`;
  }

  const point: [number, number, number] = [
    roundCoordinate(pointVec.x),
    roundCoordinate(pointVec.y),
    roundCoordinate(pointVec.z)
  ];

  return {
    point,
    pointText: formatPoint(point),
    note,
    jsonSnippet: buildHighlightJsonSnippet(point, presetId)
  };
}

export {
  captureHighlightDraft
};
