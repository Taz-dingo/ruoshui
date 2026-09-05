import type { ExecutionContext } from "@cloudflare/workers-types";

import { createApp } from "./app.js";
import { createD1AuthRepository } from "./db/d1/auth-repository.js";
import { createD1ForumRepository } from "./db/d1/forum-repository.js";
import { createD1PlaceRepository } from "./db/d1/place-repository.js";
import { createD1StoryRepository } from "./db/d1/story-repository.js";
import { createD1StoryReviewRepository } from "./db/d1/story-review-repository.js";
import { parseAdminUserIds } from "./lib/admin.js";
import { createAuthService, type AuthService } from "./lib/auth.js";
import { createCloudflareAuthEmailSender } from "./lib/auth-email.js";
import { createPlaceService } from "./lib/place.js";
import { createR2StorageProvider } from "./lib/storage.js";
import { createStoryService } from "./lib/story.js";
import { createStoryReviewService } from "./lib/story-review.js";
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
      adminUserIds: parseAdminUserIds(env.ADMIN_USER_IDS),
      authService,
      corsOrigin: env.CORS_ORIGIN ?? "http://localhost:5173",
      forumRepository: createD1ForumRepository(env.DB, {
        mediaPublicBaseUrl: env.MEDIA_PUBLIC_BASE_URL,
      }),
      placeService: createPlaceService({ repository: createD1PlaceRepository(env.DB) }),
      runtime: "cloudflare",
      storageProvider: createR2StorageProvider({
        bucket: env.MEDIA_BUCKET,
        bucketName: env.MEDIA_BUCKET_NAME ?? "ruoshui-media",
        publicApiBaseUrl: env.PUBLIC_API_BASE_URL,
        publicBaseUrl: env.MEDIA_PUBLIC_BASE_URL,
        uploadSigningSecret: env.UPLOAD_SIGNING_SECRET,
      }),
      storyReviewService: authService
        ? createStoryReviewService({ repository: createD1StoryReviewRepository(env.DB) })
        : undefined,
      storyService: authService
        ? createStoryService({ repository: createD1StoryRepository(env.DB) })
        : undefined,
    });

    return app.fetch(request, env, executionContext);
  },
};
