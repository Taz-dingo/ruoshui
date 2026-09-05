import { commentIdSchema } from "@ruoshui/shared";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";

import { requireAdminUser } from "../lib/admin.js";
import type { AuthService } from "../lib/auth.js";
import type { CommentModerationService } from "../lib/comment-moderation.js";
import { SESSION_COOKIE_NAME } from "./auth-route.js";

interface CreateCommentModerationRouteOptions {
  adminUserIds: ReadonlySet<string>;
  authService?: AuthService;
  moderationService: CommentModerationService;
}

function createCommentModerationRoute(
  options: CreateCommentModerationRouteOptions,
): Hono {
  const route = new Hono();

  async function requireAdmin(context: Parameters<Parameters<Hono["use"]>[1]>[0]) {
    if (!options.authService) {
      return context.json({ ok: false, error: "Authentication is not configured." }, 503);
    }
    const user = await options.authService.getUserForSessionToken(
      getCookie(context, SESSION_COOKIE_NAME),
    );
    if (!user) {
      return context.json({ ok: false, error: "Authentication required." }, 401);
    }
    requireAdminUser(user.id, options.adminUserIds);
    return user.id;
  }

  route.get("/", async (context) => {
    const userId = await requireAdmin(context);
    if (userId instanceof Response) return userId;
    const rawLimit = Number(context.req.query("limit") ?? "100");
    const limit = Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 100;
    return context.json({
      ok: true,
      data: await options.moderationService.listComments(limit),
    });
  });

  route.post("/:commentId/hide", async (context) => {
    const userId = await requireAdmin(context);
    if (userId instanceof Response) return userId;
    const commentId = commentIdSchema.parse(context.req.param("commentId"));
    return context.json({
      ok: true,
      data: await options.moderationService.hideComment(commentId),
    });
  });

  route.post("/:commentId/restore", async (context) => {
    const userId = await requireAdmin(context);
    if (userId instanceof Response) return userId;
    const commentId = commentIdSchema.parse(context.req.param("commentId"));
    return context.json({
      ok: true,
      data: await options.moderationService.restoreComment(commentId),
    });
  });

  return route;
}

export { createCommentModerationRoute };
