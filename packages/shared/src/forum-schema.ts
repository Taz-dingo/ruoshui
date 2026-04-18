import { z } from "zod";

const sceneIdSchema = z.string().min(1).max(120);
const entityIdSchema = z.string().min(1).max(120);
const postStatusSchema = z.enum(["draft", "published", "archived"]);
const mediaStatusSchema = z.enum(["pending", "ready", "failed"]);

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

const sceneSchema = z.object({
  id: sceneIdSchema,
  title: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  assetUrl: z.string().max(1024).optional(),
  previewImage: z.string().max(1024).optional(),
});

const mediaAssetSchema = z.object({
  id: entityIdSchema,
  bucket: z.string().min(1).max(120),
  objectKey: z.string().min(1).max(512),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().nonnegative(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  publicUrl: z.string().url().optional(),
  status: mediaStatusSchema,
});

const forumPostSchema = z.object({
  id: entityIdSchema,
  sceneId: sceneIdSchema.optional(),
  pinId: entityIdSchema.optional(),
  title: z.string().min(1).max(160),
  excerpt: z.string().max(280).optional(),
  body: z.string().min(1),
  coverAssetId: entityIdSchema.optional(),
  status: postStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const createSceneInputSchema = sceneSchema.omit({
  id: true,
});

const upsertSceneInputSchema = sceneSchema;

const createForumPostInputSchema = z.object({
  sceneId: sceneIdSchema.optional(),
  pinId: entityIdSchema.optional(),
  title: z.string().min(1).max(160),
  excerpt: z.string().max(280).optional(),
  body: z.string().min(1),
  coverAssetId: entityIdSchema.optional(),
  mediaAssetIds: z.array(entityIdSchema).max(12).optional(),
  status: postStatusSchema.default("draft"),
});

const createScenePinInputSchema = z.object({
  sceneId: sceneIdSchema,
  postId: entityIdSchema.optional(),
  title: z.string().min(1).max(120),
  summary: z.string().max(240).optional(),
  position: vector3Schema,
  target: vector3Schema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const sceneBootstrapSchema = z.object({
  scene: sceneSchema.nullable(),
  pins: z.array(scenePinSchema),
  posts: z.array(forumPostSchema),
});

const forumPostDetailSchema = forumPostSchema.extend({
  mediaAssets: z.array(mediaAssetSchema),
  pins: z.array(scenePinSchema),
});

const listForumPostsInputSchema = z.object({
  sceneId: sceneIdSchema.optional(),
  pinId: entityIdSchema.optional(),
  status: postStatusSchema.optional(),
  limit: z.coerce.number().int().positive().max(50).default(12),
});

const uploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
  category: z.enum(["post-cover", "post-inline", "scene-reference"]),
});

const uploadTicketSchema = z.object({
  provider: z.enum(["none", "alioss", "r2"]),
  method: z.enum(["PUT", "POST"]),
  uploadUrl: z.string().url().optional(),
  objectKey: z.string().min(1),
  publicUrl: z.string().url().optional(),
  expiresAt: z.string().datetime(),
  headers: z.record(z.string(), z.string()).default({}),
  fields: z.record(z.string(), z.string()).default({}),
  note: z.string().optional(),
});

const confirmMediaAssetInputSchema = z.object({
  bucket: z.string().min(1).max(120),
  objectKey: z.string().min(1).max(512),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  sceneId: sceneIdSchema.optional(),
  postId: entityIdSchema.optional(),
  status: mediaStatusSchema.default("ready"),
});

type ScenePin = z.infer<typeof scenePinSchema>;
type MediaAsset = z.infer<typeof mediaAssetSchema>;
type ForumPost = z.infer<typeof forumPostSchema>;
type ForumPostDetail = z.infer<typeof forumPostDetailSchema>;
type Scene = z.infer<typeof sceneSchema>;
type ConfirmMediaAssetInput = z.infer<typeof confirmMediaAssetInputSchema>;
type CreateForumPostInput = z.infer<typeof createForumPostInputSchema>;
type CreateSceneInput = z.infer<typeof createSceneInputSchema>;
type CreateScenePinInput = z.infer<typeof createScenePinInputSchema>;
type ListForumPostsInput = z.infer<typeof listForumPostsInputSchema>;
type SceneBootstrap = z.infer<typeof sceneBootstrapSchema>;
type UpsertSceneInput = z.infer<typeof upsertSceneInputSchema>;
type UploadRequest = z.infer<typeof uploadRequestSchema>;
type UploadTicket = z.infer<typeof uploadTicketSchema>;

export {
  confirmMediaAssetInputSchema,
  createForumPostInputSchema,
  createSceneInputSchema,
  createScenePinInputSchema,
  entityIdSchema,
  forumPostSchema,
  forumPostDetailSchema,
  listForumPostsInputSchema,
  mediaAssetSchema,
  mediaStatusSchema,
  postStatusSchema,
  sceneBootstrapSchema,
  sceneIdSchema,
  sceneSchema,
  scenePinSchema,
  upsertSceneInputSchema,
  uploadRequestSchema,
  uploadTicketSchema,
  vector3Schema,
};

export type {
  ConfirmMediaAssetInput,
  CreateForumPostInput,
  CreateSceneInput,
  CreateScenePinInput,
  ForumPost,
  ForumPostDetail,
  ListForumPostsInput,
  MediaAsset,
  Scene,
  SceneBootstrap,
  ScenePin,
  UpsertSceneInput,
  UploadRequest,
  UploadTicket,
};
