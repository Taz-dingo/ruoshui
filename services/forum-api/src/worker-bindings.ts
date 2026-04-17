import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

interface CloudflareForumApiBindings {
  CORS_ORIGIN?: string;
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
  MEDIA_BUCKET_NAME?: string;
  MEDIA_PUBLIC_BASE_URL?: string;
  PUBLIC_API_BASE_URL: string;
  UPLOAD_SIGNING_SECRET: string;
}

export type { CloudflareForumApiBindings };
