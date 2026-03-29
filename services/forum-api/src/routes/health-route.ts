import { Hono } from "hono";

const healthRoute = new Hono();

healthRoute.get("/", (context) =>
  context.json({
    ok: true,
    service: "forum-api",
    timestamp: new Date().toISOString(),
  }),
);

export { healthRoute };
