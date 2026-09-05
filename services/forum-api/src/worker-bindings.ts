import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

import type { CloudflareEmailBinding } from "./lib/auth-email.js";

interface CloudflareForumApiBindings {
  ADMIN_USER_IDS?: string;
  AUTH_EMAIL_FROM?: string;
  AUTH_EMAIL_FROM_NAME?: string;
  AUTH_OTP_SECRET?: string;
  CORS_ORIGIN?: string;
  DB: D1Database;
  EMAIL?: CloudflareEmailBinding;
  MEDIA_BUCKET: R2Bucket;
  MEDIA_BUCKET_NAME?: string;
  MEDIA_PUBLIC_BASE_URL?: string;
  PUBLIC_API_BASE_URL: string;
  UPLOAD_SIGNING_SECRET: string;
}

export type { CloudflareForumApiBindings };
