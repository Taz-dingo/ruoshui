import assert from "node:assert/strict";
import test from "node:test";
import type { CreatePlaceInput, Place, UpdatePlaceInput } from "@ruoshui/shared";

import { AdminAccessError, parseAdminUserIds, requireAdminUser } from "../lib/admin.js";
import {
  PlaceServiceError,
  createPlaceService,
  type PlaceRepository,
} from "../lib/place.js";

const anchor = {
  markerPosition: { x: 1, y: 0, z: 2 },
  cameraPose: {
    position: { x: 1.6, y: 0.8, z: 2.7 },
    target: { x: 1, y: 0, z: 2 },
    fovDeg: 52,
  },
};

function createHarness() {
  const places = new Map<string, Place>();
  let sequence = 0;

  const repository: PlaceRepository = {
    async createPlace(input: CreatePlaceInput, now) {
      const id = `place_${++sequence}`;
      const record: Place = {
        id,
        ...(input.sceneId ? { sceneId: input.sceneId } : {}),
        name: input.name,
        ...(input.intro ? { intro: input.intro } : {}),
        anchor: input.anchor,
        sortOrder: input.sortOrder,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      places.set(id, record);
      return record;
    },
    async getPlace(placeId) {
      return places.get(placeId) ?? null;
    },
    async listPlaces(input) {
      return [...places.values()]
        .filter((place) => !input.sceneId || place.sceneId === input.sceneId)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    },
    async updatePlace(placeId, input: UpdatePlaceInput, now) {
      const current = places.get(placeId);
      if (!current) return null;
      const updated: Place = {
        ...current,
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.intro === undefined
          ? {}
          : input.intro === null
            ? { intro: undefined }
            : { intro: input.intro }),
        ...(input.anchor === undefined ? {} : { anchor: input.anchor }),
        ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
        updatedAt: now.toISOString(),
      };
      places.set(placeId, updated);
      return updated;
    },
  };

  return { places, service: createPlaceService({ repository }) };
}

test("Place stores a manually authored camera pose", async () => {
  const harness = createHarness();
  const place = await harness.service.createPlace({
    sceneId: "scene_hhuc",
    name: "若水广场",
    intro: "校园中央的公共记忆入口。",
    anchor,
    sortOrder: 1,
  });

  assert.equal(place.name, "若水广场");
  assert.equal(place.anchor.cameraPose.fovDeg, 52);
  assert.equal(place.anchor.markerPosition.z, 2);
});

test("Place list can be scoped by scene", async () => {
  const harness = createHarness();
  await harness.service.createPlace({ sceneId: "scene_a", name: "A", anchor, sortOrder: 2 });
  await harness.service.createPlace({ sceneId: "scene_b", name: "B", anchor, sortOrder: 1 });

  const places = await harness.service.listPlaces({ sceneId: "scene_a" });
  assert.deepEqual(places.map((place) => place.name), ["A"]);
});

test("updating a missing Place returns a 404 service error", async () => {
  const harness = createHarness();
  await assert.rejects(
    () => harness.service.updatePlace("place_missing", { name: "不存在" }),
    (error) => error instanceof PlaceServiceError && error.status === 404,
  );
});

test("admin allowlist uses stable User IDs", () => {
  const admins = parseAdminUserIds("user_1, user_2");
  requireAdminUser("user_2", admins);
  assert.throws(
    () => requireAdminUser("someone@example.com", admins),
    (error) => error instanceof AdminAccessError && error.status === 403,
  );
});
