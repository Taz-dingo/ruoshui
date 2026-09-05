import { z } from "zod";

const entityIdSchema = z.string().min(1).max(120);
const userIdSchema = entityIdSchema;
const storyIdSchema = entityIdSchema;
const storyRevisionIdSchema = entityIdSchema;
const placeIdSchema = entityIdSchema;
const commentIdSchema = entityIdSchema;
const mediaAssetIdSchema = entityIdSchema;

const vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const cameraPoseSchema = z.object({
  position: vector3Schema,
  target: vector3Schema,
  fovDeg: z.number().min(20).max(100).optional(),
});

const spatialAnchorSchema = z.object({
  markerPosition: vector3Schema,
  cameraPose: cameraPoseSchema,
});

const storyLocationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({ kind: z.literal("place"), placeId: placeIdSchema }),
  z.object({ kind: z.literal("anchor"), anchor: spatialAnchorSchema }),
]);

const userSchema = z.object({
  id: userIdSchema,
  displayName: z.string().trim().min(1).max(80).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const authProviderSchema = z.enum(["email"]);
const storyRevisionStatusSchema = z.enum([
  "draft",
  "pending_review",
  "published",
  "changes_requested",
  "rejected",
]);
const storyStatusSchema = z.enum(["active", "unpublished", "deleted"]);
const commentStatusSchema = z.enum(["visible", "hidden", "deleted"]);

const storyContentFieldsSchema = z.object({
  title: z.string().trim().max(160).optional(),
  body: z.string().trim().max(20_000).optional(),
  memoryTime: z.string().trim().max(120).optional(),
  mediaAssetIds: z.array(mediaAssetIdSchema).max(12).default([]),
  location: storyLocationSchema.default({ kind: "none" }),
});

const storyDraftPatchSchema = storyContentFieldsSchema.partial();

const submitStoryRevisionInputSchema = storyContentFieldsSchema.superRefine((value, context) => {
  const hasBody = Boolean(value.body?.trim());
  const hasMedia = value.mediaAssetIds.length > 0;

  if (!hasBody && !hasMedia) {
    context.addIssue({
      code: "custom",
      message: "Story must contain body text or at least one media asset.",
      path: ["body"],
    });
  }
});

const placeSchema = z.object({
  id: placeIdSchema,
  name: z.string().trim().min(1).max(120),
  intro: z.string().trim().max(2_000).optional(),
  anchor: spatialAnchorSchema,
  sortOrder: z.number().int().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const storyRevisionSchema = submitStoryRevisionInputSchema.extend({
  id: storyRevisionIdSchema,
  storyId: storyIdSchema,
  status: storyRevisionStatusSchema,
  createdByUserId: userIdSchema,
  moderationNote: z.string().max(2_000).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const storySchema = z.object({
  id: storyIdSchema,
  authorUserId: userIdSchema,
  status: storyStatusSchema,
  publishedRevisionId: storyRevisionIdSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const createCommentInputSchema = z.object({
  storyId: storyIdSchema,
  body: z.string().trim().min(1).max(2_000),
  rootCommentId: commentIdSchema.optional(),
  replyToCommentId: commentIdSchema.optional(),
});

const commentSchema = z.object({
  id: commentIdSchema,
  storyId: storyIdSchema,
  authorUserId: userIdSchema,
  rootCommentId: commentIdSchema.nullable(),
  replyToCommentId: commentIdSchema.nullable(),
  body: z.string().min(1).max(2_000),
  status: commentStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const storyLikeKeySchema = z.object({
  storyId: storyIdSchema,
  userId: userIdSchema,
});

const commentLikeKeySchema = z.object({
  commentId: commentIdSchema,
  userId: userIdSchema,
});

type AuthProvider = z.infer<typeof authProviderSchema>;
type CameraPose = z.infer<typeof cameraPoseSchema>;
type Comment = z.infer<typeof commentSchema>;
type CommentLikeKey = z.infer<typeof commentLikeKeySchema>;
type CommentStatus = z.infer<typeof commentStatusSchema>;
type CreateCommentInput = z.infer<typeof createCommentInputSchema>;
type Place = z.infer<typeof placeSchema>;
type SpatialAnchor = z.infer<typeof spatialAnchorSchema>;
type Story = z.infer<typeof storySchema>;
type StoryDraftPatch = z.infer<typeof storyDraftPatchSchema>;
type StoryLikeKey = z.infer<typeof storyLikeKeySchema>;
type StoryLocation = z.infer<typeof storyLocationSchema>;
type StoryRevision = z.infer<typeof storyRevisionSchema>;
type StoryRevisionStatus = z.infer<typeof storyRevisionStatusSchema>;
type StoryStatus = z.infer<typeof storyStatusSchema>;
type SubmitStoryRevisionInput = z.infer<typeof submitStoryRevisionInputSchema>;
type User = z.infer<typeof userSchema>;

export {
  authProviderSchema,
  cameraPoseSchema,
  commentIdSchema,
  commentLikeKeySchema,
  commentSchema,
  commentStatusSchema,
  createCommentInputSchema,
  mediaAssetIdSchema,
  placeIdSchema,
  placeSchema,
  spatialAnchorSchema,
  storyDraftPatchSchema,
  storyIdSchema,
  storyLikeKeySchema,
  storyLocationSchema,
  storyRevisionIdSchema,
  storyRevisionSchema,
  storyRevisionStatusSchema,
  storySchema,
  storyStatusSchema,
  submitStoryRevisionInputSchema,
  userIdSchema,
  userSchema,
  vector3Schema,
};

export type {
  AuthProvider,
  CameraPose,
  Comment,
  CommentLikeKey,
  CommentStatus,
  CreateCommentInput,
  Place,
  SpatialAnchor,
  Story,
  StoryDraftPatch,
  StoryLikeKey,
  StoryLocation,
  StoryRevision,
  StoryRevisionStatus,
  StoryStatus,
  SubmitStoryRevisionInput,
  User,
};
