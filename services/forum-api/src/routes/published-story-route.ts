import {
  listPublishedStoriesInputSchema,
  mediaAssetIdSchema,
  storyIdSchema,
} from "@ruoshui/shared";
import { Hono } from "hono";

import type { StorageProvider } from "../lib/storage.js";
import type { StoryReadService } from "../lib/story-read.js";

interface CreatePublishedStoryRouteOptions {
  readService: StoryReadService;
  storageProvider: StorageProvider;
}

function createPublishedStoryRoute(options: CreatePublishedStoryRouteOptions): Hono {
  const route = new Hono();

  route.get("/", async (context) => {
    const input = listPublishedStoriesInputSchema.parse({
      placeId: context.req.query("placeId"),
      limit: context.req.query("limit"),
    });
    return context.json({
      ok: true,
      data: await options.readService.listPublishedStories(input),
    });
  });

  async function readMediaObject(
    media: { mimeType: string; objectKey: string },
    maxAge: number,
  ): Promise<Response> {
    if (!options.storageProvider.readObject) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Story media reads are not available for the current storage provider.",
        }),
        {
          status: 501,
          headers: { "content-type": "application/json; charset=UTF-8" },
        },
      );
    }

    const object = await options.storageProvider.readObject(media.objectKey);
    if (!object) {
      return new Response(null, { status: 404 });
    }

    const headers = new Headers();
    headers.set("content-type", object.contentType ?? media.mimeType);
    headers.set("cache-control", `public, max-age=${maxAge}`);
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
  }

  route.get("/:storyId/media/:mediaAssetId/thumbnail", async (context) => {
    const storyId = storyIdSchema.parse(context.req.param("storyId"));
    const mediaAssetId = mediaAssetIdSchema.parse(context.req.param("mediaAssetId"));
    const media = await options.readService.getPublishedStoryMediaDerivativeRef(
      storyId,
      mediaAssetId,
      "thumbnail",
    );
    return readMediaObject(media, 86_400);
  });

  route.get("/:storyId/media/:mediaAssetId", async (context) => {
    const storyId = storyIdSchema.parse(context.req.param("storyId"));
    const mediaAssetId = mediaAssetIdSchema.parse(context.req.param("mediaAssetId"));
    const media = await options.readService.getPublishedStoryMediaRef(storyId, mediaAssetId);
    return readMediaObject(media, 300);
  });

  route.get("/:storyId", async (context) => {
    const storyId = storyIdSchema.parse(context.req.param("storyId"));
    return context.json({
      ok: true,
      data: await options.readService.getPublishedStory(storyId),
    });
  });

  return route;
}

export { createPublishedStoryRoute };
