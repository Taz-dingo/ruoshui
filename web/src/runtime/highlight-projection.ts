import type { ViewerHighlight } from '../content/types';

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
  const cameraEntity = runtimeState?.camera;
  const cameraComponent = cameraEntity?.camera;
  const canvasElement = runtimeState?.canvasElement;

  if (!cameraEntity || !cameraComponent || !canvasElement || highlights.length === 0) {
    return [];
  }

  const canvasWidth = canvasElement.width;
  const canvasHeight = canvasElement.height;
  const rect = canvasElement.getBoundingClientRect();

  if (!canvasWidth || !canvasHeight || !rect.width || !rect.height) {
    return [];
  }

  const cameraPosition = cameraEntity.getPosition();
  const cameraForward = cameraEntity.forward;

  return highlights.map((highlight) => {
    const worldPosition = new pc.Vec3(
      highlight.position[0],
      highlight.position[1],
      highlight.position[2]
    );
    const toHighlight = new pc.Vec3().sub2(worldPosition, cameraPosition);
    const facingDot =
      toHighlight.x * cameraForward.x +
      toHighlight.y * cameraForward.y +
      toHighlight.z * cameraForward.z;
    const screenPosition = cameraComponent.worldToScreen(
      worldPosition,
      canvasWidth,
      canvasHeight
    );
    const left = rect.left + (screenPosition.x / canvasWidth) * rect.width;
    const top = rect.top + (screenPosition.y / canvasHeight) * rect.height;
    const isVisible =
      facingDot > 0 &&
      left >= rect.left + 20 &&
      left <= rect.left + rect.width - 20 &&
      top >= rect.top + 20 &&
      top <= rect.top + rect.height - 20;

    return {
      id: highlight.id,
      name: highlight.name,
      left,
      top,
      isVisible
    };
  });
}

export {
  projectHighlightPins
};
