import { Hono } from "hono";

import { createUploadTicket, getStorageProviderName } from "../lib/storage.js";

const storageRoute = new Hono();

storageRoute.get("/status", (context) =>
  context.json({
    ok: true,
    provider: getStorageProviderName(),
  }),
);

storageRoute.post("/upload-requests", async (context) => {
  const payload = await context.req.json();
  const ticket = await createUploadTicket(payload);

  return context.json({
    ok: true,
    data: ticket,
  });
});

export { storageRoute };
