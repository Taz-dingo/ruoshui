import {
  commentIdSchema,
  createStoryCommentInputSchema,
  storyIdSchema,
} from "@ruoshui/shared";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";

import type { AuthService } from "../lib/auth.js";
import type { StorySocialService } from "../lib/story-social.js";
import { SESSION_COOKIE_NAME } from "./auth-route.js";

interface CreateStorySocialRouteOptions {
  authService?: AuthService;
  socialService: StorySocialService;
}

function createStorySocialRoute(options: CreateStorySocialRouteOptions): Hono {
  const route = new Hono();

  async function getViewerUserId(context: Parameters<Parameters<Hono["use"]>[1]>[0]) {
    if (!options.authService) return undefined;
    const user = await options.authService.getUserForSessionToken(
      getCookie(context, SESSION_COOKIE_NAME),
    );
    return user?.id;
  }

  async function requireViewerUserId(context: Parameters<Parameters<Hono["use"]>[1]>[0]) {
    if (!options.authService) {
      return context.json({ ok: false, error: "Authentication is not configured." }, 503);
    }
    const user = await options.authService.getUserForSessionToken(
      getCookie(context, SESSION_COOKIE_NAME),
    );
    if (!user) {
      return context.json({ ok: false, error: "Authentication required." }, 401);
    }
    return user.id;
  }

  route.get("/stories/:storyId", async (context) => {
    const storyId = storyIdSchema.parse(context.req.param("storyId"));
    const viewerUserId = await getViewerUserId(context);
    return context.json({
      ok: true,
      data: await options.socialService.getSocial(storyId, viewerUserId),
    });
  });

  route.put("/stories/:storyId/like", async (context) => {
    const userId = await requireViewerUserId(context);
    if (userId instanceof Response) return userId;
    const storyId = storyIdSchema.parse(context.req.param("storyId"));
    return context.json({
      ok: true,
      data: await options.socialService.setStoryLike(storyId, userId, true),
    });
  });

  route.delete("/stories/:storyId/like", async (context) => {
    const userId = await requireViewerUserId(context);
    if (userId instanceof Response) return userId;
    const storyId = storyIdSchema.parse(context.req.param("storyId"));
    return context.json({
      ok: true,
      data: await options.socialService.setStoryLike(storyId, userId, false),
    });
  });

  route.post("/stories/:storyId/comments", async (context) => {
    const userId = await requireViewerUserId(context);
    if (userId instanceof Response) return userId;
    const storyId = storyIdSchema.parse(context.req.param("storyId"));
    const input = createStoryCommentInputSchema.parse(await context.req.json());
    return context.json(
      {
        ok: true,
        data: await options.socialService.createComment(storyId, userId, input),
      },
      201,
    );
  });

  route.put("/comments/:commentId/like", async (context) => {
    const userId = await requireViewerUserId(context);
    if (userId instanceof Response) return userId;
    const commentId = commentIdSchema.parse(context.req.param("commentId"));
    return context.json({
      ok: true,
      data: await options.socialService.setCommentLike(commentId, userId, true),
    });
  });

  route.delete("/comments/:commentId/like", async (context) => {
    const userId = await requireViewerUserId(context);
    if (userId instanceof Response) return userId;
    const commentId = commentIdSchema.parse(context.req.param("commentId"));
    return context.json({
      ok: true,
      data: await options.socialService.setCommentLike(commentId, userId, false),
    });
  });

  return route;
}

export { createStorySocialRoute };
