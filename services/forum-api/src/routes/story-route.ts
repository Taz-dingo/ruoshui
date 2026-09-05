import {
  confirmMediaAssetInputSchema,
  createStoryDraftInputSchema,
  mediaAssetIdSchema,
  storyDraftPatchSchema,
  storyIdSchema,
  uploadRequestSchema,
} from "@ruoshui/shared";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";

import type { AuthService } from "../lib/auth.js";
import type { StorageProvider } from "../lib/storage.js";
import type { StoryAuthorService } from "../lib/story-author.js";
import type { StoryOwnerReadService } from "../lib/story-owner-read.js";
import type { StoryService } from "../lib/story.js";
import { SESSION_COOKIE_NAME } from "./auth-route.js";

interface CreateStoryRouteOptions {
  authService: AuthService;
  storageProvider: StorageProvider;
  storyAuthorService?: StoryAuthorService;
  storyOwnerReadService?: StoryOwnerReadService;
  storyService: StoryService;
}

function createStoryRoute(options: CreateStoryRouteOptions): Hono {
  const route = new Hono();

  async function getUser(context: Parameters<Parameters<Hono["use"]>[1]>[0]) {
    return options.authService.getUserForSessionToken(
      getCookie(context, SESSION_COOKIE_NAME),
    );
  }

  route.get("/mine", async (context) => {
    const user = await getUser(context);
    if (!user) {
      return context.json({ ok: false, error: "Authentication required." }, 401);
    }
    if (!options.storyOwnerReadService) {
      return context.json({ ok: false, error: "Story ownership reads are not configured." }, 503);
    }
    return context.json({
      ok: true,
      data: await options.storyOwnerReadService.listOwnedStories(user.id),
    });
  });

  route.get("/:storyId/media/:mediaAssetId", async (context) => {
    const user = await getUser(context);
    if (!user) {
      return context.json({ ok: false, error: "Authentication required." }, 401);
    }
    if (!options.storyOwnerReadService) {
      return context.json({ ok: false, error: "Story ownership reads are not configured." }, 503);
    }
    if (!options.storageProvider.readObject) {
      return context.json(
        { ok: false, error: "Story media reads are not available for the current storage provider." },
        501,
      );
    }

    const storyId = storyIdSchema.parse(context.req.param("storyId"));
    const mediaAssetId = mediaAssetIdSchema.parse(context.req.param("mediaAssetId"));
    const media = await options.storyOwnerReadService.getOwnedStoryMediaRef(
      user.id,
      storyId,
      mediaAssetId,
    );
    if (!media) {
      return context.notFound();
    }

    const object = await options.storageProvider.readObject(media.objectKey);
    if (!object) {
      return context.notFound();
    }

    const headers = new Headers();
    headers.set("content-type", object.contentType ?? media.mimeType);
    headers.set("cache-control", "private, max-age=300");
    headers.set("vary", "Cookie");
    if (object.contentLength !== undefined) {
      headers.set("content-length", String(object.contentLength));
    }
    if (object.etag) {
      headers.set("etag", object.etag);
    }
    if (object.uploadedAt) {
      headers.set("last-modified", object.uploadedAt.toUTCString());
    }

    return new Response(object.body as BodyInit | null, {
      headers,
      status: 200,
    });
  });

  route.post("/media/upload-requests", async (context) => {
    const user = await getUser(context);
    if (!user) {
      return context.json({ ok: false, error: "Authentication required." }, 401);
    }

    const input = uploadRequestSchema.parse(await context.req.json());
    const ticket = await options.storageProvider.createUploadTicket(input, {
      objectKeyPrefix: `story-drafts/${user.id}`,
    });
    return context.json({ ok: true, data: ticket }, 201);
  });

  route.post("/media/confirm", async (context) => {
    const user = await getUser(context);
    if (!user) {
      return context.json({ ok: false, error: "Authentication required." }, 401);
    }

    const input = confirmMediaAssetInputSchema.parse(await context.req.json());
    const result = await options.storyService.confirmMediaAsset(user.id, {
      ...input,
      postId: undefined,
      sceneId: undefined,
      status: "ready",
    });
    return context.json({ ok: true, data: result }, 201);
  });

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

  route.post("/:storyId/edit", async (context) => {
    const user = await getUser(context);
    if (!user) {
      return context.json({ ok: false, error: "Authentication required." }, 401);
    }
    if (!options.storyAuthorService) {
      return context.json({ ok: false, error: "Story authoring is not configured." }, 503);
    }
    const storyId = storyIdSchema.parse(context.req.param("storyId"));
    const draft = await options.storyAuthorService.createEditDraft(user.id, storyId);
    return context.json({ ok: true, data: draft }, 201);
  });

  route.post("/:storyId/unpublish", async (context) => {
    const user = await getUser(context);
    if (!user) {
      return context.json({ ok: false, error: "Authentication required." }, 401);
    }
    if (!options.storyAuthorService) {
      return context.json({ ok: false, error: "Story authoring is not configured." }, 503);
    }
    const storyId = storyIdSchema.parse(context.req.param("storyId"));
    const story = await options.storyAuthorService.unpublishStory(user.id, storyId);
    return context.json({ ok: true, data: story });
  });

  route.delete("/:storyId", async (context) => {
    const user = await getUser(context);
    if (!user) {
      return context.json({ ok: false, error: "Authentication required." }, 401);
    }
    if (!options.storyAuthorService) {
      return context.json({ ok: false, error: "Story authoring is not configured." }, 503);
    }
    const storyId = storyIdSchema.parse(context.req.param("storyId"));
    const story = await options.storyAuthorService.deleteStory(user.id, storyId);
    return context.json({ ok: true, data: story });
  });

  return route;
}

export { createStoryRoute };
