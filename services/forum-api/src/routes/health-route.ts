import { Hono } from "hono";

import { checkDatabaseConnection } from "../db/client.js";

const healthRoute = new Hono();

healthRoute.get("/", async (context) => {
  try {
    await checkDatabaseConnection();

    return context.json({
      ok: true,
      database: "connected",
      service: "forum-api",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return context.json(
      {
        ok: false,
        database: "unavailable",
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

export { healthRoute };
