import type { ExecutionContext } from "@cloudflare/workers-types";

import { createApp } from "./app.js";
import { createD1ForumRepository } from "./db/d1/forum-repository.js";
import { createR2StorageProvider } from "./lib/storage.js";
import type { CloudflareForumApiBindings } from "./worker-bindings.js";

export default {
  fetch(request: Request, env: CloudflareForumApiBindings, executionContext: ExecutionContext) {
    const app = createApp({
      corsOrigin: env.CORS_ORIGIN ?? "http://localhost:5173",
      forumRepository: createD1ForumRepository(env.DB, {
        mediaPublicBaseUrl: env.MEDIA_PUBLIC_BASE_URL,
      }),
      runtime: "cloudflare",
      storageProvider: createR2StorageProvider({
        bucket: env.MEDIA_BUCKET,
        bucketName: env.MEDIA_BUCKET_NAME ?? "ruoshui-media",
        publicApiBaseUrl: env.PUBLIC_API_BASE_URL,
        publicBaseUrl: env.MEDIA_PUBLIC_BASE_URL,
        uploadSigningSecret: env.UPLOAD_SIGNING_SECRET,
      }),
    });

    return app.fetch(request, env, executionContext);
  },
};
