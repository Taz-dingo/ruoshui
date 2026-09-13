import assert from "node:assert/strict";
import test from "node:test";
import type { Place, User } from "@ruoshui/shared";

import type { AuthService } from "../lib/auth.js";
import type { PlaceService } from "../lib/place.js";
import { createPlaceRoute } from "../routes/place-route.js";

const now = "2026-09-06T00:00:00.000Z";
const place: Place = {
  id: "place_ruoshui",
  sceneId: "ruoshui-main",
  name: "若水广场",
  intro: "校园中央的公共记忆入口。",
  anchor: {
    markerPosition: { x: 1, y: 0, z: 2 },
    cameraPose: {
      position: { x: 1.6, y: 0.8, z: 2.7 },
      target: { x: 1, y: 0, z: 2 },
      fovDeg: 52,
    },
  },
  sortOrder: 10,
  createdAt: now,
  updatedAt: now,
};

function createUser(id: string): User {
  return { id, displayName: id, createdAt: now, updatedAt: now };
}

function createHarness(sessionUser: User | null) {
  const authService = {
    async getUserForSessionToken() {
      return sessionUser;
    },
  } as Pick<AuthService, "getUserForSessionToken"> as AuthService;

  const placeService = {
    async listPlaces(input: { sceneId?: string }) {
      return !input.sceneId || input.sceneId === place.sceneId ? [place] : [];
    },
    async getPlace() {
      return place;
    },
    async createPlace() {
      return place;
    },
    async updatePlace() {
      return place;
    },
  } satisfies PlaceService;

  return createPlaceRoute({
    adminUserIds: new Set(["user_admin"]),
    authService,
    placeService,
  });
}

test("admin Place list requires authentication", async () => {
  const route = createHarness(null);
  const response = await route.request("/admin?sceneId=ruoshui-main", {
    headers: { cookie: "ruoshui_session=token" },
  });
  assert.equal(response.status, 401);
});

test("admin Place list is registered before the dynamic place-id route", async () => {
  const route = createHarness(createUser("user_admin"));
  const response = await route.request("/admin?sceneId=ruoshui-main", {
    headers: { cookie: "ruoshui_session=token" },
  });
  assert.equal(response.status, 200);
  const payload = (await response.json()) as { data: Place[] };
  assert.equal(payload.data[0]?.id, "place_ruoshui");
});
