import {
  createStoryDraftInputSchema,
  storyDraftPatchSchema,
  storyIdSchema,
} from "@ruoshui/shared";
import { Hono, type Context } from "hono";
import { getCookie } from "hono/cookie";

import type { AuthService } from "../lib/auth.js";
import type { StoryService } from "../lib/story.js";
import { SESSION_COOKIE_NAME } from "./auth-route.js";

interface CreateStoryRouteOptions {
  authService: AuthService;
  storyService: StoryService;
}

function createStoryRoute(options: CreateStoryRouteOptions): Hono {
  const route = new Hono();

  async function getUser(context: Context) {
    return options.authService.getUserForSessionToken(
      getCookie(context, SESSION_COOKIE_NAME),
    );
  }

  route.get("/drafts", async (context) => {
    const user = await getUser(context);
    if (!user) {
      return context.json({ ok: false, error: "Authentication required." }, 401);
    }
    return context.json({ ok: true, data: await options.storyService.listDrafts(user.id) });
  });

  route.post("/drafts", async (context) => {
    const user = await getUser(context);
    if (!user) {
      return context.json({ ok: false, error: "Authentication required." }, 401);
    }
    const input = createStoryDraftInputSchema.parse(await context.req.json());
    const draft = await options.storyService.createDraft(user.id, input);
    return context.json({ ok: true, data: draft }, 201);
  });

  route.get("/drafts/:storyId", async (context) => {
    const user = await getUser(context);
    if (!user) {
      return context.json({ ok: false, error: "Authentication required." }, 401);
    }
    const storyId = storyIdSchema.parse(context.req.param("storyId"));
    return context.json({ ok: true, data: await options.storyService.getDraft(user.id, storyId) });
  });

  route.patch("/drafts/:storyId", async (context) => {
    const user = await getUser(context);
    if (!user) {
      return context.json({ ok: false, error: "Authentication required." }, 401);
    }
    const storyId = storyIdSchema.parse(context.req.param("storyId"));
    const input = storyDraftPatchSchema.parse(await context.req.json());
    const draft = await options.storyService.updateDraft(user.id, storyId, input);
    return context.json({ ok: true, data: draft });
  });

  route.post("/drafts/:storyId/submit", async (context) => {
    const user = await getUser(context);
    if (!user) {
      return context.json({ ok: false, error: "Authentication required." }, 401);
    }
    const storyId = storyIdSchema.parse(context.req.param("storyId"));
    const draft = await options.storyService.submitDraft(user.id, storyId);
    return context.json({ ok: true, data: draft });
  });

  return route;
}

export { createStoryRoute };
