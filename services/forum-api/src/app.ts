import { Hono } from "hono";
import { cors } from "hono/cors";
import { ZodError } from "zod";

import { AdminAccessError } from "./lib/admin.js";
import { AuthServiceError, type AuthService } from "./lib/auth.js";
import {
  CommentModerationServiceError,
  type CommentModerationService,
} from "./lib/comment-moderation.js";
import type { ForumRepository } from "./lib/forum-repository.js";
import { PlaceServiceError, type PlaceService } from "./lib/place.js";
import { StorageProviderError, type StorageProvider } from "./lib/storage.js";
import type { StoryAuthorService } from "./lib/story-author.js";
import type { StoryOwnerReadService } from "./lib/story-owner-read.js";
import {
  StoryReadServiceError,
  type StoryReadService,
} from "./lib/story-read.js";
import {
  StoryReviewServiceError,
  type StoryReviewService,
} from "./lib/story-review.js";
import {
  StorySocialServiceError,
  type StorySocialService,
} from "./lib/story-social.js";
import { StoryServiceError, type StoryService } from "./lib/story.js";
import { createAuthRoute } from "./routes/auth-route.js";
import { createCommentModerationRoute } from "./routes/comment-moderation-route.js";
import { createForumRoute } from "./routes/forum-route.js";
import { createHealthRoute } from "./routes/health-route.js";
import { createPlaceRoute } from "./routes/place-route.js";
import { createPublishedStoryRoute } from "./routes/published-story-route.js";
import { createStorageRoute } from "./routes/storage-route.js";
import { createStoryReviewRoute } from "./routes/story-review-route.js";
import { createStorySocialRoute } from "./routes/story-social-route.js";
import { createStoryRoute } from "./routes/story-route.js";

interface CreateAppOptions {
  adminUserIds?: ReadonlySet<string>;
  authService?: AuthService;
  commentModerationService?: CommentModerationService;
  corsOrigin: string;
  forumRepository: ForumRepository;
  placeService?: PlaceService;
  runtime: "node" | "cloudflare";
  storageProvider: StorageProvider;
  storyAuthorService?: StoryAuthorService;
  storyOwnerReadService?: StoryOwnerReadService;
  storyReadService?: StoryReadService;
  storyReviewService?: StoryReviewService;
  storyService?: StoryService;
  storySocialService?: StorySocialService;
}

function isDatabaseUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code =
    "code" in error && typeof error.code === "string" ? error.code : undefined;
  const message = error.message.toLowerCase();

  return (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ECONNRESET" ||
    code === "3D000" ||
    code === "28P01" ||
    message.includes("failed query:") ||
    message.includes("connect econnrefused") ||
    message.includes("database") ||
    message.includes("postgres") ||
    message.includes("d1")
  );
}

function getErrorDetail(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Unknown error";
  }

  return error.message || String(error);
}

function createApp(options: CreateAppOptions): Hono {
  const app = new Hono();

  app.use(
    "*",
    cors({
      credentials: true,
      origin: options.corsOrigin,
    }),
  );

  app.route(
    "/health",
    createHealthRoute({
      forumRepository: options.forumRepository,
      runtime: options.runtime,
    }),
  );
  if (options.authService) {
    app.route(
      "/api/auth",
      createAuthRoute({
        authService: options.authService,
      }),
    );
  }
  if (options.placeService) {
    app.route(
      "/api/places",
      createPlaceRoute({
        adminUserIds: options.adminUserIds ?? new Set(),
        authService: options.authService,
        placeService: options.placeService,
      }),
    );
  }
  if (options.storyReadService) {
    app.route(
      "/api/published-stories",
      createPublishedStoryRoute({
        readService: options.storyReadService,
        storageProvider: options.storageProvider,
      }),
    );
  }
  if (options.storySocialService) {
    app.route(
      "/api/story-social",
      createStorySocialRoute({
        authService: options.authService,
        socialService: options.storySocialService,
      }),
    );
  }
  if (options.commentModerationService) {
    app.route(
      "/api/admin/comments",
      createCommentModerationRoute({
        adminUserIds: options.adminUserIds ?? new Set(),
        authService: options.authService,
        moderationService: options.commentModerationService,
      }),
    );
  }
  if (options.storyReviewService) {
    app.route(
      "/api/admin/story-reviews",
      createStoryReviewRoute({
        adminUserIds: options.adminUserIds ?? new Set(),
        authService: options.authService,
        reviewService: options.storyReviewService,
        storageProvider: options.storageProvider,
      }),
    );
  }
  if (options.authService && options.storyService) {
    app.route(
      "/api/stories",
      createStoryRoute({
        authService: options.authService,
        storageProvider: options.storageProvider,
        storyAuthorService: options.storyAuthorService,
        storyOwnerReadService: options.storyOwnerReadService,
        storyService: options.storyService,
      }),
    );
  }
  app.route(
    "/api/forum",
    createForumRoute({
      forumRepository: options.forumRepository,
    }),
  );
  app.route(
    "/api/storage",
    createStorageRoute({
      storageProvider: options.storageProvider,
    }),
  );
  app.get("/media/*", async (context) => {
    if (!options.storageProvider.readObject) {
      return context.json(
        {
          ok: false,
          error: "Media reads are not available for the current storage provider.",
        },
        501,
      );
    }

    const requestPath = context.req.path;
    const objectKey = requestPath.startsWith("/media/")
      ? requestPath.slice("/media/".length)
      : "";

    if (!objectKey) {
      return context.notFound();
    }

    const object = await options.storageProvider.readObject(objectKey);
    if (!object) {
      return context.notFound();
    }

    const headers = new Headers();
    if (object.contentType) {
      headers.set("content-type", object.contentType);
    }
    if (object.contentLength !== undefined) {
      headers.set("content-length", String(object.contentLength));
    }
    if (object.etag) {
      headers.set("etag", object.etag);
    }
    if (object.uploadedAt) {
      headers.set("last-modified", object.uploadedAt.toUTCString());
    }
    headers.set("cache-control", "public, max-age=60");

    return new Response(object.body as BodyInit | null, {
      headers,
      status: 200,
    });
  });

  app.onError((error, context) => {
    if (error instanceof ZodError) {
      return context.json(
        {
          ok: false,
          error: "Invalid request",
          details: error.flatten(),
        },
        400,
      );
    }

    if (
      error instanceof AuthServiceError ||
      error instanceof CommentModerationServiceError ||
      error instanceof StoryServiceError ||
      error instanceof StoryReadServiceError ||
      error instanceof StoryReviewServiceError ||
      error instanceof StorySocialServiceError ||
      error instanceof PlaceServiceError ||
      error instanceof AdminAccessError
    ) {
      return context.json(
        {
          ok: false,
          error: error.message,
        },
        error.status,
      );
    }

    if (error instanceof StorageProviderError) {
      return context.json(
        {
          ok: false,
          error: error.message,
        },
        error.status,
      );
    }

    if (isDatabaseUnavailableError(error)) {
      return context.json(
        {
          ok: false,
          error: "Database unavailable",
          detail: getErrorDetail(error),
        },
        503,
      );
    }

    return context.json(
      {
        ok: false,
        error: getErrorDetail(error),
      },
      500,
    );
  });

  return app;
}

export { createApp };
