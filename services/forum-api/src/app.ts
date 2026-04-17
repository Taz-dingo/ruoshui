import { Hono } from "hono";
import { cors } from "hono/cors";
import { ZodError } from "zod";

import type { ForumRepository } from "./lib/forum-repository.js";
import { StorageProviderError, type StorageProvider } from "./lib/storage.js";
import { createForumRoute } from "./routes/forum-route.js";
import { createHealthRoute } from "./routes/health-route.js";
import { createStorageRoute } from "./routes/storage-route.js";

interface CreateAppOptions {
  corsOrigin: string;
  forumRepository: ForumRepository;
  runtime: "node" | "cloudflare";
  storageProvider: StorageProvider;
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
