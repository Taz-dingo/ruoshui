import {
  confirmProfileAvatarInputSchema,
  profileAvatarUploadInputSchema,
  updateUserProfileDetailsInputSchema,
  type UserProfile,
} from "@ruoshui/shared";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";

import type { AuthService } from "../lib/auth.js";
import type { UserProfileService } from "../lib/profile.js";
import { SESSION_COOKIE_NAME } from "./auth-route.js";

interface CreateUserProfileRouteOptions {
  authService: AuthService;
  profileService: UserProfileService;
}

function avatarUrl(userId: string, hasAvatar: boolean): string | null {
  return hasAvatar ? `/api/users/${encodeURIComponent(userId)}/avatar` : null;
}

function createUserProfileRoute(options: CreateUserProfileRouteOptions): Hono {
  const route = new Hono();

  async function getCurrentUser(context: Parameters<Parameters<Hono["use"]>[1]>[0]) {
    return options.authService.getUserForSessionToken(
      getCookie(context, SESSION_COOKIE_NAME),
    );
  }

  route.get("/me/profile", async (context) => {
    const user = await getCurrentUser(context);
    if (!user) {
      return context.json({ ok: false, error: "Authentication required." }, 401);
    }
    const details = await options.profileService.getProfile(user.id);
    const profile: UserProfile = {
      userId: user.id,
      displayName: user.displayName,
      avatarUrl: avatarUrl(user.id, Boolean(details.avatarObjectKey)),
      alumniIdentity: details.alumniIdentity,
    };
    return context.json({ ok: true, data: profile });
  });

  route.patch("/me/profile", async (context) => {
    const user = await getCurrentUser(context);
    if (!user) {
      return context.json({ ok: false, error: "Authentication required." }, 401);
    }
    const input = updateUserProfileDetailsInputSchema.parse(await context.req.json());
    const updatedUser = input.displayName === undefined
      ? user
      : await options.authService.updateDisplayName(user.id, input.displayName);
    const details = input.alumniIdentity === undefined
      ? await options.profileService.getProfile(user.id)
      : await options.profileService.updateAlumniIdentity(user.id, input.alumniIdentity);
    const profile: UserProfile = {
      userId: user.id,
      displayName: updatedUser.displayName,
      avatarUrl: avatarUrl(user.id, Boolean(details.avatarObjectKey)),
      alumniIdentity: details.alumniIdentity,
    };
    return context.json({ ok: true, data: profile });
  });

  route.post("/me/avatar/upload-request", async (context) => {
    const user = await getCurrentUser(context);
    if (!user) {
      return context.json({ ok: false, error: "Authentication required." }, 401);
    }
    const input = profileAvatarUploadInputSchema.parse(await context.req.json());
    return context.json(
      {
        ok: true,
        data: await options.profileService.createAvatarUploadTicket(user.id, input),
      },
      201,
    );
  });

  route.put("/me/avatar", async (context) => {
    const user = await getCurrentUser(context);
    if (!user) {
      return context.json({ ok: false, error: "Authentication required." }, 401);
    }
    const input = confirmProfileAvatarInputSchema.parse(await context.req.json());
    await options.profileService.confirmAvatar(user.id, input.objectKey);
    const details = await options.profileService.getProfile(user.id);
    const profile: UserProfile = {
      userId: user.id,
      displayName: user.displayName,
      avatarUrl: avatarUrl(user.id, Boolean(details.avatarObjectKey)),
      alumniIdentity: details.alumniIdentity,
    };
    return context.json({ ok: true, data: profile });
  });

  route.delete("/me/avatar", async (context) => {
    const user = await getCurrentUser(context);
    if (!user) {
      return context.json({ ok: false, error: "Authentication required." }, 401);
    }
    await options.profileService.clearAvatar(user.id);
    return context.json({ ok: true });
  });

  route.get("/:userId/avatar", async (context) => {
    const userId = context.req.param("userId");
    const object = await options.profileService.getAvatarObject(userId);
    if (!object) {
      return context.notFound();
    }
    const headers = new Headers();
    headers.set("content-type", object.contentType ?? "application/octet-stream");
    headers.set("cache-control", "public, max-age=300");
    if (object.contentLength !== undefined) {
      headers.set("content-length", String(object.contentLength));
    }
    if (object.etag) headers.set("etag", object.etag);
    if (object.uploadedAt) headers.set("last-modified", object.uploadedAt.toUTCString());
    return new Response(object.body as BodyInit | null, { headers, status: 200 });
  });

  return route;
}

export { createUserProfileRoute };
