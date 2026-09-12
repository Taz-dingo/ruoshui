import assert from 'node:assert/strict';
import test from 'node:test';

import {
  projectStoryAnchorPins,
  projectWorldPoint,
} from '../src/runtime/highlight-projection.ts';
import {
  requestSetStoryAnchorPins,
  subscribeViewerCommands,
} from '../src/ui/commands/viewer-command-bus.ts';

class Vec3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  sub2(a, b) {
    this.x = a.x - b.x;
    this.y = a.y - b.y;
    this.z = a.z - b.z;
    return this;
  }
}

const pc = { Vec3 };

function createRuntime() {
  return {
    camera: {
      getPosition() {
        return new Vec3(0, 0, 0);
      },
      forward: { x: 0, y: 0, z: 1 },
      camera: {
        worldToScreen(worldPosition, out) {
          out.x = worldPosition.x;
          out.y = worldPosition.y;
          out.z = worldPosition.z;
          return out;
        },
      },
    },
    canvasElement: {
      width: 2000,
      height: 1000,
      getBoundingClientRect() {
        return {
          left: 10,
          top: 20,
          width: 1000,
          height: 500,
        };
      },
    },
  };
}

function visiblePin(id, x, y = 200) {
  return {
    id,
    title: id,
    position: [x, y, 1],
  };
}

test('world projection keeps PlayCanvas client pixels in CSS overlay space', () => {
  const point = projectWorldPoint(pc, createRuntime(), [400, 200, 1]);
  assert.deepEqual(point, {
    left: 410,
    top: 220,
    isVisible: true,
  });
});

test('points behind the camera stay hidden', () => {
  const point = projectWorldPoint(pc, createRuntime(), [400, 200, -1]);
  assert.equal(point?.isVisible, false);
});

test('one visible anchor remains a single pin', () => {
  const items = projectStoryAnchorPins({
    pc,
    runtimeState: createRuntime(),
    pins: [visiblePin('story-a', 400)],
  });
  assert.equal(items.length, 1);
  assert.equal(items[0]?.kind, 'anchor');
  assert.equal(items[0]?.id, 'story-a');
});

test('nearby anchors cluster and expose their world centroid', () => {
  const items = projectStoryAnchorPins({
    pc,
    runtimeState: createRuntime(),
    pins: [visiblePin('story-b', 440), visiblePin('story-a', 400)],
  });
  assert.equal(items.length, 1);
  const cluster = items[0];
  assert.equal(cluster?.kind, 'cluster');
  if (cluster?.kind !== 'cluster') return;
  assert.deepEqual(cluster.storyIds, ['story-a', 'story-b']);
  assert.deepEqual(cluster.position, [420, 200, 1]);
});

test('cluster membership is stable across API ordering', () => {
  const pins = [
    visiblePin('story-c', 700),
    visiblePin('story-a', 400),
    visiblePin('story-b', 480),
  ];
  const forward = projectStoryAnchorPins({
    pc,
    runtimeState: createRuntime(),
    pins,
  });
  const reversed = projectStoryAnchorPins({
    pc,
    runtimeState: createRuntime(),
    pins: [...pins].reverse(),
  });
  assert.deepEqual(
    forward.map((item) => item.id),
    reversed.map((item) => item.id),
  );
});

test('story anchor pins are replayed to a late viewer subscriber', () => {
  const pins = [{ id: 'story-a', title: 'A', position: [1, 2, 3] }];
  requestSetStoryAnchorPins(pins);

  const received = [];
  const unsubscribe = subscribeViewerCommands((command) => {
    received.push(command);
  });

  try {
    const replay = received.find((command) => command.type === 'set-story-anchor-pins');
    assert.deepEqual(replay?.pins, pins);
  } finally {
    unsubscribe();
    requestSetStoryAnchorPins([]);
  }
});
