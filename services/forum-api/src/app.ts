import { Hono } from "hono";
import { cors } from "hono/cors";

import { env } from "./env.js";
import { forumRoute } from "./routes/forum-route.js";
import { healthRoute } from "./routes/health-route.js";
import { storageRoute } from "./routes/storage-route.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: env.CORS_ORIGIN,
  }),
);

app.route("/health", healthRoute);
app.route("/api/forum", forumRoute);
app.route("/api/storage", storageRoute);

export { app };
