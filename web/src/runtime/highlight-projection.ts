import type { ViewerHighlight } from '../content/types';

interface ProjectedWorldPoint {
  left: number;
  top: number;
  isVisible: boolean;
}

interface NamedWorldPin {
  id: string;
  name: string;
  position: [number, number, number];
}

interface ProjectNamedPinsArgs {
  pc: any;
  runtimeState: any;
  pins: NamedWorldPin[];
}

interface ProjectHighlightPinsArgs {
  pc: any;
  runtimeState: any;
  highlights: ViewerHighlight[];
}

interface StoryAnchorProjection {
  id: string;
  kind: 'anchor';
  left: number;
  top: number;
  isVisible: boolean;
  title: string;
}

interface StoryAnchorClusterProjection {
  id: string;
  kind: 'cluster';
  left: number;
  top: number;
  isVisible: boolean;
  storyIds: string[];
  position: [number, number, number];
}

type StoryAnchorProjectionItem = StoryAnchorProjection | StoryAnchorClusterProjection;

interface ProjectStoryAnchorPinsArgs {
  clusterRadius?: number;
  pc: any;
  runtimeState: any;
  pins: Array<{
    id: string;
    title: string;
    position: [number, number, number];
  }>;
}

function projectNamedPins({
  pc,
  runtimeState,
  pins
}: ProjectNamedPinsArgs) {
  return pins
    .map((pin) => {
      const projected = projectWorldPoint(pc, runtimeState, pin.position);
      if (!projected) {
        return null;
      }

      return {
        id: pin.id,
        name: pin.name,
        ...projected
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function projectHighlightPins({
  pc,
  runtimeState,
  highlights
}: ProjectHighlightPinsArgs) {
  return projectNamedPins({
    pc,
    runtimeState,
    pins: highlights.map((highlight) => ({
      id: highlight.id,
      name: highlight.name,
      position: highlight.position
    }))
  });
}

function projectStoryAnchorPins({
  clusterRadius = 56,
  pc,
  runtimeState,
  pins
}: ProjectStoryAnchorPinsArgs): StoryAnchorProjectionItem[] {
  const projected = pins.map((pin) => ({
    pin,
    projected: projectWorldPoint(pc, runtimeState, pin.position)
  }));
  const hidden = projected
    .filter((item) => !item.projected?.isVisible)
    .map(({ pin, projected: point }) => ({
      id: pin.id,
      kind: 'anchor' as const,
      left: point?.left ?? 0,
      top: point?.top ?? 0,
      isVisible: false,
      title: pin.title
    }));
  const visible = projected
    .filter(
      (item): item is {
        pin: (typeof pins)[number];
        projected: ProjectedWorldPoint;
      } => Boolean(item.projected?.isVisible)
    )
    .sort((a, b) => a.pin.id.localeCompare(b.pin.id));
  const groups: Array<{
    items: typeof visible;
    left: number;
    top: number;
  }> = [];

  // O(n²) greedy clustering is acceptable for the current scale. Sorting by
  // stable Story id first makes membership deterministic across API orderings.
  for (const item of visible) {
    const point = item.projected;
    const group = groups.find((candidate) => {
      const dx = candidate.left - point.left;
      const dy = candidate.top - point.top;
      return Math.hypot(dx, dy) <= clusterRadius;
    });

    if (!group) {
      groups.push({ items: [item], left: point.left, top: point.top });
      continue;
    }

    group.items.push(item);
    group.left = group.items.reduce((sum, current) => sum + current.projected.left, 0) / group.items.length;
    group.top = group.items.reduce((sum, current) => sum + current.projected.top, 0) / group.items.length;
  }

  const grouped = groups.map((group) => {
    if (group.items.length === 1) {
      const item = group.items[0];
      return {
        id: item.pin.id,
        kind: 'anchor' as const,
        left: item.projected.left,
        top: item.projected.top,
        isVisible: true,
        title: item.pin.title
      };
    }

    const storyIds = group.items.map((item) => item.pin.id).sort();
    const position: [number, number, number] = [
      group.items.reduce((sum, item) => sum + item.pin.position[0], 0) / group.items.length,
      group.items.reduce((sum, item) => sum + item.pin.position[1], 0) / group.items.length,
      group.items.reduce((sum, item) => sum + item.pin.position[2], 0) / group.items.length,
    ];
    return {
      id: `story-anchor-cluster:${storyIds.join(',')}`,
      kind: 'cluster' as const,
      left: group.left,
      top: group.top,
      isVisible: true,
      storyIds,
      position
    };
  });

  return [...grouped, ...hidden];
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

  // CameraComponent.worldToScreen already uses PlayCanvas' client rect, so
  // the result is CSS pixels relative to the canvas. The React overlay uses
  // the same coordinate space; applying a backing-store scale here would
  // move pins toward the top-left on high-DPI displays.
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
  projectNamedPins,
  projectStoryAnchorPins,
  projectWorldPoint
};

export type {
  NamedWorldPin,
  ProjectedWorldPoint
};
