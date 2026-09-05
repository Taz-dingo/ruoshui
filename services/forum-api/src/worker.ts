import type { ExecutionContext } from "@cloudflare/workers-types";

import { createApp } from "./app.js";
import { createD1AuthRepository } from "./db/d1/auth-repository.js";
import { createD1CommentModerationRepository } from "./db/d1/comment-moderation-repository.js";
import { createD1ForumRepository } from "./db/d1/forum-repository.js";
import { createD1PlaceRepository } from "./db/d1/place-repository.js";
import { createD1StoryAuthorRepository } from "./db/d1/story-author-repository.js";
import { createD1StoryOwnerReadRepository } from "./db/d1/story-owner-read-repository.js";
import { createD1StoryReadRepository } from "./db/d1/story-read-repository.js";
import { createD1StoryRepository } from "./db/d1/story-repository.js";
import { createD1StoryReviewRepository } from "./db/d1/story-review-repository.js";
import { createD1StorySocialRepository } from "./db/d1/story-social-repository.js";
import { parseAdminUserIds } from "./lib/admin.js";
import { createAuthService, type AuthService } from "./lib/auth.js";
import { createTencentSesAuthEmailSender } from "./lib/auth-email.js";
import { createCommentModerationService } from "./lib/comment-moderation.js";
import { createPlaceService } from "./lib/place.js";
import { createR2StorageProvider } from "./lib/storage.js";
import { createStoryAuthorService } from "./lib/story-author.js";
import { createStoryOwnerReadService } from "./lib/story-owner-read.js";
import { createStoryReadService } from "./lib/story-read.js";
import { createStoryService } from "./lib/story.js";
import { createStoryReviewService } from "./lib/story-review.js";
import { createStorySocialService } from "./lib/story-social.js";
import type { CloudflareForumApiBindings } from "./worker-bindings.js";

function parseTencentSesTemplateId(value: string | undefined): number | null {
  if (!value?.trim()) {
    return null;
  }
  const templateId = Number(value);
  return Number.isSafeInteger(templateId) && templateId > 0 ? templateId : null;
}

function createConfiguredAuthService(env: CloudflareForumApiBindings): AuthService | undefined {
  const templateId = parseTencentSesTemplateId(env.TENCENT_SES_TEMPLATE_ID);
  if (
    !env.AUTH_OTP_SECRET ||
    !env.AUTH_EMAIL_FROM ||
    !env.TENCENT_CLOUD_SECRET_ID ||
    !env.TENCENT_CLOUD_SECRET_KEY ||
    !templateId
  ) {
    return undefined;
  }

  return createAuthService({
    repository: createD1AuthRepository(env.DB),
    emailSender: createTencentSesAuthEmailSender({
      fromEmail: env.AUTH_EMAIL_FROM,
      fromName: env.AUTH_EMAIL_FROM_NAME,
      region: env.TENCENT_SES_REGION ?? "ap-guangzhou",
      secretId: env.TENCENT_CLOUD_SECRET_ID,
      secretKey: env.TENCENT_CLOUD_SECRET_KEY,
      templateId,
    }),
    otpSecret: env.AUTH_OTP_SECRET,
  });
}

export default {
  fetch(request: Request, env: CloudflareForumApiBindings, executionContext: ExecutionContext) {
    const authService = createConfiguredAuthService(env);
    const storyRepository = createD1StoryRepository(env.DB);
    const app = createApp({
      adminUserIds: parseAdminUserIds(env.ADMIN_USER_IDS),
      authService,
      commentModerationService: createCommentModerationService({
        repository: createD1CommentModerationRepository(env.DB),
      }),
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
      storyAuthorService: authService
        ? createStoryAuthorService({
            repository: createD1StoryAuthorRepository(env.DB, storyRepository),
          })
        : undefined,
      storyOwnerReadService: authService
        ? createStoryOwnerReadService(createD1StoryOwnerReadRepository(env.DB))
        : undefined,
      storyReadService: createStoryReadService(createD1StoryReadRepository(env.DB)),
      storyReviewService: authService
        ? createStoryReviewService({ repository: createD1StoryReviewRepository(env.DB) })
        : undefined,
      storyService: authService
        ? createStoryService({ repository: storyRepository })
        : undefined,
      storySocialService: createStorySocialService({
        repository: createD1StorySocialRepository(env.DB),
      }),
    });

    return app.fetch(request, env, executionContext);
  },
};

export { parseTencentSesTemplateId };
