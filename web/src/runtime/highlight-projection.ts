import type { ViewerHighlight } from '../content/types';

interface ProjectedWorldPoint {
  left: number;
  top: number;
  isVisible: boolean;
}

interface ProjectHighlightPinsArgs {
  pc: any;
  runtimeState: any;
  highlights: ViewerHighlight[];
}

function projectHighlightPins({
  pc,
  runtimeState,
  highlights
}: ProjectHighlightPinsArgs) {
  return highlights
    .map((highlight) => {
      const projected = projectWorldPoint(pc, runtimeState, highlight.position);
      if (!projected) {
        return null;
      }

      return {
        id: highlight.id,
        name: highlight.name,
        ...projected
      };
    })
    .filter(Boolean);
}

function projectWorldPoint(
  pc: any,
  runtimeState: any,
  position: [number, number, number]
): ProjectedWorldPoint | null {
  const cameraEntity = runtimeState?.camera;
  const cameraComponent = cameraEntity?.camera;
  const canvasElement = runtimeState?.canvasElement;

  if (!cameraEntity || !cameraComponent || !canvasElement) {
    return null;
  }

  const rect = canvasElement.getBoundingClientRect();

  if (!rect.width || !rect.height) {
    return null;
  }

  const cameraPosition = cameraEntity.getPosition();
  const cameraForward = cameraEntity.forward;
  const worldPosition = new pc.Vec3(position[0], position[1], position[2]);
  const toHighlight = new pc.Vec3().sub2(worldPosition, cameraPosition);
  const facingDot =
    toHighlight.x * cameraForward.x +
    toHighlight.y * cameraForward.y +
    toHighlight.z * cameraForward.z;
  const screenPosition = cameraComponent.worldToScreen(
    worldPosition,
    new pc.Vec3()
  );
  const left = rect.left + screenPosition.x;
  const top = rect.top + screenPosition.y;
  const isVisible =
    facingDot > 0 &&
    left >= rect.left + 20 &&
    left <= rect.left + rect.width - 20 &&
    top >= rect.top + 20 &&
    top <= rect.top + rect.height - 20;

  return {
    left,
    top,
    isVisible
  };
}

export {
  projectHighlightPins,
  projectWorldPoint
};
