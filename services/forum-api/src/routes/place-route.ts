import {
  createPlaceInputSchema,
  listPlacesInputSchema,
  placeIdSchema,
  updatePlaceInputSchema,
} from "@ruoshui/shared";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";

import { requireAdminUser } from "../lib/admin.js";
import type { AuthService } from "../lib/auth.js";
import type { PlaceService } from "../lib/place.js";
import { SESSION_COOKIE_NAME } from "./auth-route.js";

interface CreatePlaceRouteOptions {
  adminUserIds: ReadonlySet<string>;
  authService?: AuthService;
  placeService: PlaceService;
}

function createPlaceRoute(options: CreatePlaceRouteOptions): Hono {
  const route = new Hono();

  async function requireAdmin(context: Parameters<Parameters<Hono["use"]>[1]>[0]) {
    if (!options.authService) {
      return context.json({ ok: false, error: "Admin authentication is not configured." }, 503);
    }

    const user = await options.authService.getUserForSessionToken(
      getCookie(context, SESSION_COOKIE_NAME),
    );
    if (!user) {
      return context.json({ ok: false, error: "Authentication required." }, 401);
    }

    requireAdminUser(user.id, options.adminUserIds);
    return user;
  }

  route.get("/", async (context) => {
    const input = listPlacesInputSchema.parse({ sceneId: context.req.query("sceneId") });
    return context.json({ ok: true, data: await options.placeService.listPlaces(input) });
  });

  // Kept separate from the public list so the Place authoring console can verify
  // admin access without attempting a write first. Register before /:placeId.
  route.get("/admin", async (context) => {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) {
      return admin;
    }
    const input = listPlacesInputSchema.parse({ sceneId: context.req.query("sceneId") });
    return context.json({ ok: true, data: await options.placeService.listPlaces(input) });
  });

  route.get("/:placeId", async (context) => {
    const placeId = placeIdSchema.parse(context.req.param("placeId"));
    return context.json({ ok: true, data: await options.placeService.getPlace(placeId) });
  });

  route.post("/", async (context) => {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) {
      return admin;
    }

    const input = createPlaceInputSchema.parse(await context.req.json());
    const place = await options.placeService.createPlace(input);
    return context.json({ ok: true, data: place }, 201);
  });

  route.patch("/:placeId", async (context) => {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) {
      return admin;
    }

    const placeId = placeIdSchema.parse(context.req.param("placeId"));
    const input = updatePlaceInputSchema.parse(await context.req.json());
    return context.json({
      ok: true,
      data: await options.placeService.updatePlace(placeId, input),
    });
  });

  return route;
}

export { createPlaceRoute };
