import { Hono } from "hono";
import { cors } from "hono/cors";
import { ZodError } from "zod";

import { env } from "./env.js";
import { forumRoute } from "./routes/forum-route.js";
import { healthRoute } from "./routes/health-route.js";
import { storageRoute } from "./routes/storage-route.js";

const app = new Hono();

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
    message.includes("postgres")
  );
}

function getErrorDetail(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Unknown error";
  }

  return error.message || String(error);
}

app.use(
  "*",
  cors({
    origin: env.CORS_ORIGIN,
  }),
);

app.route("/health", healthRoute);
app.route("/api/forum", forumRoute);
app.route("/api/storage", storageRoute);

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

export { app };
