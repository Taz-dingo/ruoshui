import type { ExecutionContext } from "@cloudflare/workers-types";

import { createApp } from "./app.js";
import { createD1AuthRepository } from "./db/d1/auth-repository.js";
import { createD1ForumRepository } from "./db/d1/forum-repository.js";
import { createD1StoryRepository } from "./db/d1/story-repository.js";
import { createAuthService, type AuthService } from "./lib/auth.js";
import { createCloudflareAuthEmailSender } from "./lib/auth-email.js";
import { createR2StorageProvider } from "./lib/storage.js";
import { createStoryService } from "./lib/story.js";
import type { CloudflareForumApiBindings } from "./worker-bindings.js";

function createConfiguredAuthService(env: CloudflareForumApiBindings): AuthService | undefined {
  if (!env.AUTH_OTP_SECRET || !env.AUTH_EMAIL_FROM || !env.EMAIL) {
    return undefined;
  }

  return createAuthService({
    repository: createD1AuthRepository(env.DB),
    emailSender: createCloudflareAuthEmailSender({
      binding: env.EMAIL,
      fromEmail: env.AUTH_EMAIL_FROM,
      fromName: env.AUTH_EMAIL_FROM_NAME,
    }),
    otpSecret: env.AUTH_OTP_SECRET,
  });
}

export default {
  fetch(request: Request, env: CloudflareForumApiBindings, executionContext: ExecutionContext) {
    const authService = createConfiguredAuthService(env);
    const app = createApp({
      authService,
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
      storyService: authService
        ? createStoryService({ repository: createD1StoryRepository(env.DB) })
        : undefined,
    });

    return app.fetch(request, env, executionContext);
  },
};
