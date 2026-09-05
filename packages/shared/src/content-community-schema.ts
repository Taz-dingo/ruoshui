import { z } from "zod";

const entityIdSchema = z.string().min(1).max(120);
const userIdSchema = entityIdSchema;
const storyIdSchema = entityIdSchema;
const storyRevisionIdSchema = entityIdSchema;
const placeIdSchema = entityIdSchema;
const contentSceneIdSchema = entityIdSchema;
const commentIdSchema = entityIdSchema;
const mediaAssetIdSchema = entityIdSchema;

const spatialVector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const cameraPoseSchema = z.object({
  position: spatialVector3Schema,
  target: spatialVector3Schema,
  fovDeg: z.number().min(20).max(100).optional(),
});

const spatialAnchorSchema = z.object({
  markerPosition: spatialVector3Schema,
  cameraPose: cameraPoseSchema,
});

const storyLocationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }).strict(),
  z.object({ kind: z.literal("place"), placeId: placeIdSchema }).strict(),
  z.object({ kind: z.literal("anchor"), anchor: spatialAnchorSchema }).strict(),
]);

const userSchema = z.object({
  id: userIdSchema,
  displayName: z.string().trim().min(1).max(80).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const emailAddressSchema = z
  .string()
  .trim()
  .email()
  .max(320)
  .transform((email) => email.toLowerCase());
const authProviderSchema = z.enum(["email"]);
const requestEmailOtpInputSchema = z.object({ email: emailAddressSchema });
const verifyEmailOtpInputSchema = z.object({
  email: emailAddressSchema,
  code: z.string().regex(/^\d{6}$/),
});
const updateUserProfileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(80).nullable(),
});

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

const storyDraftFieldsSchema = z.object({
  title: z.string().trim().max(160).optional(),
  body: z.string().trim().max(20_000).optional(),
  memoryTime: z.string().trim().max(120).optional(),
  mediaAssetIds: z.array(mediaAssetIdSchema).max(12).optional(),
  location: storyLocationSchema.optional(),
});

const storyDraftPatchSchema = storyDraftFieldsSchema.superRefine((value, context) => {
  if (Object.values(value).every((field) => field === undefined)) {
    context.addIssue({
      code: "custom",
      message: "Draft update must contain at least one field.",
    });
  }
});

const createStoryDraftInputSchema = storyDraftFieldsSchema.superRefine((value, context) => {
  const meaningful =
    Boolean(value.title?.trim()) ||
    Boolean(value.body?.trim()) ||
    Boolean(value.memoryTime?.trim()) ||
    Boolean(value.mediaAssetIds?.length) ||
    (value.location !== undefined && value.location.kind !== "none");
  if (!meaningful) {
    context.addIssue({
      code: "custom",
      message: "Draft must start with at least one meaningful field.",
    });
  }
});

const validateStoryContent = (
  value: z.infer<typeof storyContentFieldsSchema>,
  context: z.RefinementCtx,
) => {
  if (!value.body?.trim() && value.mediaAssetIds.length === 0) {
    context.addIssue({
      code: "custom",
      message: "Story must contain body text or at least one media asset.",
      path: ["body"],
    });
  }
};

const submitStoryRevisionInputSchema = storyContentFieldsSchema.superRefine(validateStoryContent);

const placeSchema = z.object({
  id: placeIdSchema,
  sceneId: contentSceneIdSchema.optional(),
  name: z.string().trim().min(1).max(120),
  intro: z.string().trim().max(2_000).optional(),
  anchor: spatialAnchorSchema,
  sortOrder: z.number().int().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const createPlaceInputSchema = z.object({
  sceneId: contentSceneIdSchema.optional(),
  name: z.string().trim().min(1).max(120),
  intro: z.string().trim().max(2_000).optional(),
  anchor: spatialAnchorSchema,
  sortOrder: z.number().int().default(0),
});

const updatePlaceInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    intro: z.string().trim().max(2_000).nullable().optional(),
    anchor: spatialAnchorSchema.optional(),
    sortOrder: z.number().int().optional(),
  })
  .superRefine((value, context) => {
    if (Object.values(value).every((field) => field === undefined)) {
      context.addIssue({ code: "custom", message: "Place update must contain at least one field." });
    }
  });

const listPlacesInputSchema = z.object({ sceneId: contentSceneIdSchema.optional() });

const storyRevisionSchema = storyContentFieldsSchema.extend({
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

const storyDraftSchema = z.object({
  story: storySchema,
  revision: storyRevisionSchema,
});

const publishedStoryAuthorSchema = z.object({
  id: userIdSchema,
  displayName: z.string().trim().min(1).max(80).nullable(),
});

const publishedStorySchema = storyContentFieldsSchema.extend({
  id: storyIdSchema,
  author: publishedStoryAuthorSchema,
  publishedAt: z.string().datetime(),
});

const listPublishedStoriesInputSchema = z.object({
  placeId: placeIdSchema.optional(),
  limit: z.coerce.number().int().positive().max(50).default(24),
});

const storyReviewItemSchema = z.object({
  story: storySchema,
  revision: storyRevisionSchema,
  author: userSchema,
});

const storyReviewPatchSchema = z
  .object({
    title: z.string().trim().max(160).nullable().optional(),
    memoryTime: z.string().trim().max(120).nullable().optional(),
    location: storyLocationSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (Object.values(value).every((field) => field === undefined)) {
      context.addIssue({ code: "custom", message: "Review update must contain at least one field." });
    }
  });

const requestStoryChangesInputSchema = z
  .object({
    note: z.string().trim().min(1).max(2_000),
  })
  .strict();

const rejectStoryRevisionInputSchema = z
  .object({
    note: z.string().trim().max(2_000).optional(),
  })
  .strict();

const createCommentInputSchema = z.object({
  storyId: storyIdSchema,
  body: z.string().trim().min(1).max(2_000),
  rootCommentId: commentIdSchema.optional(),
  replyToCommentId: commentIdSchema.optional(),
});

const createStoryCommentInputSchema = z
  .object({
    body: z.string().trim().min(1).max(2_000),
    replyToCommentId: commentIdSchema.optional(),
  })
  .strict();

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

const publishedCommentSchema = z.object({
  id: commentIdSchema,
  storyId: storyIdSchema,
  author: publishedStoryAuthorSchema,
  rootCommentId: commentIdSchema.nullable(),
  replyToCommentId: commentIdSchema.nullable(),
  body: z.string().min(1).max(2_000),
  likeCount: z.number().int().nonnegative(),
  viewerHasLiked: z.boolean(),
  createdAt: z.string().datetime(),
});

const storySocialSchema = z.object({
  storyId: storyIdSchema,
  likeCount: z.number().int().nonnegative(),
  viewerHasLiked: z.boolean(),
  commentCount: z.number().int().nonnegative(),
  comments: z.array(publishedCommentSchema),
});

const storyLikeKeySchema = z.object({ storyId: storyIdSchema, userId: userIdSchema });
const commentLikeKeySchema = z.object({ commentId: commentIdSchema, userId: userIdSchema });

type AuthProvider = z.infer<typeof authProviderSchema>;
type CameraPose = z.infer<typeof cameraPoseSchema>;
type Comment = z.infer<typeof commentSchema>;
type CommentLikeKey = z.infer<typeof commentLikeKeySchema>;
type CommentStatus = z.infer<typeof commentStatusSchema>;
type CreateCommentInput = z.infer<typeof createCommentInputSchema>;
type CreateStoryCommentInput = z.infer<typeof createStoryCommentInputSchema>;
type CreatePlaceInput = z.infer<typeof createPlaceInputSchema>;
type CreateStoryDraftInput = z.infer<typeof createStoryDraftInputSchema>;
type ListPlacesInput = z.infer<typeof listPlacesInputSchema>;
type ListPublishedStoriesInput = z.infer<typeof listPublishedStoriesInputSchema>;
type Place = z.infer<typeof placeSchema>;
type PublishedComment = z.infer<typeof publishedCommentSchema>;
type PublishedStory = z.infer<typeof publishedStorySchema>;
type PublishedStoryAuthor = z.infer<typeof publishedStoryAuthorSchema>;
type RejectStoryRevisionInput = z.infer<typeof rejectStoryRevisionInputSchema>;
type RequestEmailOtpInput = z.infer<typeof requestEmailOtpInputSchema>;
type RequestStoryChangesInput = z.infer<typeof requestStoryChangesInputSchema>;
type SpatialAnchor = z.infer<typeof spatialAnchorSchema>;
type Story = z.infer<typeof storySchema>;
type StoryDraft = z.infer<typeof storyDraftSchema>;
type StoryDraftPatch = z.infer<typeof storyDraftPatchSchema>;
type StoryLikeKey = z.infer<typeof storyLikeKeySchema>;
type StoryLocation = z.infer<typeof storyLocationSchema>;
type StoryReviewItem = z.infer<typeof storyReviewItemSchema>;
type StoryReviewPatch = z.infer<typeof storyReviewPatchSchema>;
type StoryRevision = z.infer<typeof storyRevisionSchema>;
type StoryRevisionStatus = z.infer<typeof storyRevisionStatusSchema>;
type StorySocial = z.infer<typeof storySocialSchema>;
type StoryStatus = z.infer<typeof storyStatusSchema>;
type SubmitStoryRevisionInput = z.infer<typeof submitStoryRevisionInputSchema>;
type UpdatePlaceInput = z.infer<typeof updatePlaceInputSchema>;
type UpdateUserProfileInput = z.infer<typeof updateUserProfileInputSchema>;
type User = z.infer<typeof userSchema>;
type VerifyEmailOtpInput = z.infer<typeof verifyEmailOtpInputSchema>;

export {
  authProviderSchema,
  cameraPoseSchema,
  commentIdSchema,
  commentLikeKeySchema,
  commentSchema,
  commentStatusSchema,
  createCommentInputSchema,
  createStoryCommentInputSchema,
  createPlaceInputSchema,
  createStoryDraftInputSchema,
  emailAddressSchema,
  listPlacesInputSchema,
  listPublishedStoriesInputSchema,
  mediaAssetIdSchema,
  placeIdSchema,
  placeSchema,
  publishedCommentSchema,
  publishedStoryAuthorSchema,
  publishedStorySchema,
  rejectStoryRevisionInputSchema,
  requestEmailOtpInputSchema,
  requestStoryChangesInputSchema,
  spatialAnchorSchema,
  storyDraftPatchSchema,
  storyDraftSchema,
  storyIdSchema,
  storyLikeKeySchema,
  storyLocationSchema,
  storyReviewItemSchema,
  storyReviewPatchSchema,
  storyRevisionIdSchema,
  storyRevisionSchema,
  storyRevisionStatusSchema,
  storySchema,
  storySocialSchema,
  storyStatusSchema,
  submitStoryRevisionInputSchema,
  updatePlaceInputSchema,
  updateUserProfileInputSchema,
  userIdSchema,
  userSchema,
  verifyEmailOtpInputSchema,
};

export type {
  AuthProvider,
  CameraPose,
  Comment,
  CommentLikeKey,
  CommentStatus,
  CreateCommentInput,
  CreateStoryCommentInput,
  CreatePlaceInput,
  CreateStoryDraftInput,
  ListPlacesInput,
  ListPublishedStoriesInput,
  Place,
  PublishedComment,
  PublishedStory,
  PublishedStoryAuthor,
  RejectStoryRevisionInput,
  RequestEmailOtpInput,
  RequestStoryChangesInput,
  SpatialAnchor,
  Story,
  StoryDraft,
  StoryDraftPatch,
  StoryLikeKey,
  StoryLocation,
  StoryReviewItem,
  StoryReviewPatch,
  StoryRevision,
  StoryRevisionStatus,
  StorySocial,
  StoryStatus,
  SubmitStoryRevisionInput,
  UpdatePlaceInput,
  UpdateUserProfileInput,
  User,
  VerifyEmailOtpInput,
};
