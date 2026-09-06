import { Hono } from "hono";

import type { StorageProvider } from "../lib/storage.js";

interface CreateStorageRouteOptions {
  storageProvider: StorageProvider;
}

function createStorageRoute(options: CreateStorageRouteOptions): Hono {
  const storageRoute = new Hono();

  storageRoute.get("/status", (context) =>
    context.json({
      ok: true,
      provider: options.storageProvider.name,
    }),
  );

  storageRoute.put("/objects/:objectKey", async (context) => {
    if (!options.storageProvider.uploadObject) {
      return context.json(
        {
          ok: false,
          error: "Direct upload is not available for the current storage provider.",
        },
        501,
      );
    }

    const objectKey = decodeURIComponent(context.req.param("objectKey"));
    const result = await options.storageProvider.uploadObject({
      objectKey,
      request: context.req.raw,
    });

    return context.json(
      {
        ok: true,
        data: result,
      },
      201,
    );
  });

  return storageRoute;
}

export { createStorageRoute };
