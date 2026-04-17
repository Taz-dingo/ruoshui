import { Hono } from "hono";

import type { ForumRepository } from "../lib/forum-repository.js";

interface CreateHealthRouteOptions {
  forumRepository: ForumRepository;
  runtime: "node" | "cloudflare";
}

function createHealthRoute(options: CreateHealthRouteOptions): Hono {
  const healthRoute = new Hono();

  healthRoute.get("/", async (context) => {
    try {
      await options.forumRepository.checkConnection();

      return context.json({
        ok: true,
        database: "connected",
        runtime: options.runtime,
        service: "forum-api",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return context.json(
        {
          ok: false,
          database: "unavailable",
          runtime: options.runtime,
          service: "forum-api",
          timestamp: new Date().toISOString(),
          error:
            error instanceof Error && error.message
              ? error.message
              : String(error),
        },
        503,
      );
    }
  });

  return healthRoute;
}

export { createHealthRoute };
