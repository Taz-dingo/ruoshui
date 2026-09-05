import {
  rejectStoryRevisionInputSchema,
  requestStoryChangesInputSchema,
  storyReviewPatchSchema,
  storyRevisionIdSchema,
} from "@ruoshui/shared";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";

import { AdminAccessError, requireAdminUser } from "../lib/admin.js";
import type { AuthService } from "../lib/auth.js";
import type { StoryReviewService } from "../lib/story-review.js";
import { SESSION_COOKIE_NAME } from "./auth-route.js";

interface CreateStoryReviewRouteOptions {
  adminUserIds: ReadonlySet<string>;
  authService?: AuthService;
  reviewService: StoryReviewService;
}

function createStoryReviewRoute(options: CreateStoryReviewRouteOptions): Hono {
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

    try {
      requireAdminUser(user.id, options.adminUserIds);
    } catch (error) {
      if (error instanceof AdminAccessError) {
        return context.json({ ok: false, error: error.message }, error.status);
      }
      throw error;
    }
    return user;
  }

  route.get("/", async (context) => {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;

    return context.json({
      ok: true,
      data: await options.reviewService.listPendingReviews(),
    });
  });

  route.get("/:revisionId", async (context) => {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;

    const revisionId = storyRevisionIdSchema.parse(context.req.param("revisionId"));
    return context.json({
      ok: true,
      data: await options.reviewService.getReviewItem(revisionId),
    });
  });

  route.patch("/:revisionId", async (context) => {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;

    const revisionId = storyRevisionIdSchema.parse(context.req.param("revisionId"));
    const input = storyReviewPatchSchema.parse(await context.req.json());
    return context.json({
      ok: true,
      data: await options.reviewService.patchRevision(revisionId, input),
    });
  });

  route.post("/:revisionId/approve", async (context) => {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;

    const revisionId = storyRevisionIdSchema.parse(context.req.param("revisionId"));
    return context.json({
      ok: true,
      data: await options.reviewService.approveRevision(revisionId),
    });
  });

  route.post("/:revisionId/request-changes", async (context) => {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;

    const revisionId = storyRevisionIdSchema.parse(context.req.param("revisionId"));
    const input = requestStoryChangesInputSchema.parse(await context.req.json());
    return context.json({
      ok: true,
      data: await options.reviewService.requestChanges(revisionId, input.note),
    });
  });

  route.post("/:revisionId/reject", async (context) => {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;

    const revisionId = storyRevisionIdSchema.parse(context.req.param("revisionId"));
    const input = rejectStoryRevisionInputSchema.parse(await context.req.json());
    return context.json({
      ok: true,
      data: await options.reviewService.rejectRevision(revisionId, input.note),
    });
  });

  return route;
}

export { createStoryReviewRoute };
