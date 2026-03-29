import { z } from "zod";

const sceneIdSchema = z.string().min(1).max(120);
const entityIdSchema = z.string().min(1).max(120);

const vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const scenePinSchema = z.object({
  id: entityIdSchema,
  sceneId: sceneIdSchema,
  title: z.string().min(1).max(120),
  summary: z.string().max(240).optional(),
  position: vector3Schema,
  target: vector3Schema.optional(),
  postId: entityIdSchema.optional(),
});

const mediaAssetSchema = z.object({
  id: entityIdSchema,
  bucket: z.string().min(1).max(120),
  objectKey: z.string().min(1).max(512),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().nonnegative(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const forumPostSchema = z.object({
  id: entityIdSchema,
  sceneId: sceneIdSchema.optional(),
  pinId: entityIdSchema.optional(),
  title: z.string().min(1).max(160),
  excerpt: z.string().max(280).optional(),
  body: z.string().min(1),
  coverAssetId: entityIdSchema.optional(),
  status: z.enum(["draft", "published", "archived"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const uploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
  category: z.enum(["post-cover", "post-inline", "scene-reference"]),
});

const uploadTicketSchema = z.object({
  provider: z.enum(["none", "alioss"]),
  method: z.enum(["PUT", "POST"]),
  uploadUrl: z.string().url().optional(),
  objectKey: z.string().min(1),
  publicUrl: z.string().url().optional(),
  expiresAt: z.string().datetime(),
  headers: z.record(z.string(), z.string()).default({}),
  fields: z.record(z.string(), z.string()).default({}),
  note: z.string().optional(),
});

type ScenePin = z.infer<typeof scenePinSchema>;
type MediaAsset = z.infer<typeof mediaAssetSchema>;
type ForumPost = z.infer<typeof forumPostSchema>;
type UploadRequest = z.infer<typeof uploadRequestSchema>;
type UploadTicket = z.infer<typeof uploadTicketSchema>;

export {
  forumPostSchema,
  mediaAssetSchema,
  sceneIdSchema,
  scenePinSchema,
  uploadRequestSchema,
  uploadTicketSchema,
  vector3Schema,
};

export type {
  ForumPost,
  MediaAsset,
  ScenePin,
  UploadRequest,
  UploadTicket,
};
