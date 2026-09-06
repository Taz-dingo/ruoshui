import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
};

const scenes = sqliteTable("scenes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  assetUrl: text("asset_url"),
  previewImage: text("preview_image"),
  ...timestamps,
});

const forumPosts = sqliteTable(
  "forum_posts",
  {
    id: text("id").primaryKey(),
    sceneId: text("scene_id").references(() => scenes.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    body: text("body").notNull(),
    coverAssetId: text("cover_asset_id"),
    status: text("status", {
      enum: ["draft", "published", "archived"],
    }).notNull(),
    ...timestamps,
  },
  (table) => [index("forum_posts_scene_id_idx").on(table.sceneId)],
);

const scenePins = sqliteTable(
  "scene_pins",
  {
    id: text("id").primaryKey(),
    sceneId: text("scene_id")
      .notNull()
      .references(() => scenes.id, { onDelete: "cascade" }),
    postId: text("post_id").references(() => forumPosts.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    summary: text("summary"),
    positionX: real("position_x").notNull(),
    positionY: real("position_y").notNull(),
    positionZ: real("position_z").notNull(),
    targetX: real("target_x"),
    targetY: real("target_y"),
    targetZ: real("target_z"),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown> | null>(),
    ...timestamps,
  },
  (table) => [
    index("scene_pins_scene_id_idx").on(table.sceneId),
    uniqueIndex("scene_pins_scene_title_idx").on(table.sceneId, table.title),
  ],
);

const mediaAssets = sqliteTable(
  "media_assets",
  {
    id: text("id").primaryKey(),
    sceneId: text("scene_id").references(() => scenes.id, {
      onDelete: "set null",
    }),
    postId: text("post_id").references(() => forumPosts.id, {
      onDelete: "set null",
    }),
    ownerUserId: text("owner_user_id"),
    objectKey: text("object_key").notNull(),
    bucket: text("bucket").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    status: text("status", {
      enum: ["pending", "ready", "failed"],
    }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("media_assets_object_key_idx").on(table.objectKey),
    index("media_assets_post_id_idx").on(table.postId),
    index("media_assets_owner_user_id_idx").on(table.ownerUserId),
  ],
);

const mediaAssetDerivatives = sqliteTable(
  "media_asset_derivatives",
  {
    mediaAssetId: text("media_asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
    variant: text("variant", { enum: ["thumbnail"] }).notNull(),
    objectKey: text("object_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.mediaAssetId, table.variant] }),
    uniqueIndex("media_asset_derivatives_object_key_idx").on(table.objectKey),
  ],
);

const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name"),
  ...timestamps,
});

const authIdentities = sqliteTable(
  "auth_identities",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["email"] }).notNull(),
    subject: text("subject").notNull(),
    verifiedAt: integer("verified_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("auth_identities_provider_subject_idx").on(table.provider, table.subject),
    index("auth_identities_user_id_idx").on(table.userId),
  ],
);

const authOtpChallenges = sqliteTable(
  "auth_otp_challenges",
  {
    id: text("id").primaryKey(),
    subject: text("subject").notNull(),
    purpose: text("purpose", {
      enum: ["login", "change_email_current", "change_email_new"],
    }).notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    consumedAt: integer("consumed_at", { mode: "timestamp_ms" }),
    attemptCount: integer("attempt_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("auth_otp_subject_idx").on(table.subject)],
);

const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_idx").on(table.tokenHash),
    index("sessions_user_id_idx").on(table.userId),
  ],
);

const places = sqliteTable(
  "places",
  {
    id: text("id").primaryKey(),
    sceneId: text("scene_id").references(() => scenes.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    intro: text("intro"),
    markerX: real("marker_x").notNull(),
    markerY: real("marker_y").notNull(),
    markerZ: real("marker_z").notNull(),
    cameraX: real("camera_x").notNull(),
    cameraY: real("camera_y").notNull(),
    cameraZ: real("camera_z").notNull(),
    cameraTargetX: real("camera_target_x").notNull(),
    cameraTargetY: real("camera_target_y").notNull(),
    cameraTargetZ: real("camera_target_z").notNull(),
    cameraFovDeg: real("camera_fov_deg"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("places_scene_id_idx").on(table.sceneId),
    uniqueIndex("places_scene_name_idx").on(table.sceneId, table.name),
  ],
);

const stories = sqliteTable(
  "stories",
  {
    id: text("id").primaryKey(),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: text("status", { enum: ["active", "unpublished", "deleted"] })
      .notNull()
      .default("active"),
    publishedRevisionId: text("published_revision_id"),
    ...timestamps,
  },
  (table) => [index("stories_author_user_id_idx").on(table.authorUserId)],
);

const storyRevisions = sqliteTable(
  "story_revisions",
  {
    id: text("id").primaryKey(),
    storyId: text("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: text("status", {
      enum: ["draft", "pending_review", "published", "changes_requested", "rejected"],
    })
      .notNull()
      .default("draft"),
    title: text("title"),
    body: text("body"),
    memoryTime: text("memory_time"),
    locationKind: text("location_kind", { enum: ["none", "place", "anchor"] })
      .notNull()
      .default("none"),
    placeId: text("place_id").references(() => places.id, { onDelete: "set null" }),
    anchorMarkerX: real("anchor_marker_x"),
    anchorMarkerY: real("anchor_marker_y"),
    anchorMarkerZ: real("anchor_marker_z"),
    anchorCameraX: real("anchor_camera_x"),
    anchorCameraY: real("anchor_camera_y"),
    anchorCameraZ: real("anchor_camera_z"),
    anchorTargetX: real("anchor_target_x"),
    anchorTargetY: real("anchor_target_y"),
    anchorTargetZ: real("anchor_target_z"),
    anchorFovDeg: real("anchor_fov_deg"),
    moderationNote: text("moderation_note"),
    ...timestamps,
  },
  (table) => [
    index("story_revisions_story_id_idx").on(table.storyId),
    index("story_revisions_status_idx").on(table.status),
    index("story_revisions_place_id_idx").on(table.placeId),
  ],
);

const storyRevisionMedia = sqliteTable(
  "story_revision_media",
  {
    storyRevisionId: text("story_revision_id")
      .notNull()
      .references(() => storyRevisions.id, { onDelete: "cascade" }),
    mediaAssetId: text("media_asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.storyRevisionId, table.mediaAssetId] }),
    uniqueIndex("story_revision_media_order_idx").on(table.storyRevisionId, table.sortOrder),
  ],
);

const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    storyId: text("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    rootCommentId: text("root_comment_id"),
    replyToCommentId: text("reply_to_comment_id"),
    body: text("body").notNull(),
    status: text("status", { enum: ["visible", "hidden", "deleted"] })
      .notNull()
      .default("visible"),
    ...timestamps,
  },
  (table) => [
    index("comments_story_id_idx").on(table.storyId),
    index("comments_root_comment_id_idx").on(table.rootCommentId),
  ],
);

const storyLikes = sqliteTable(
  "story_likes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyId: text("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.storyId] })],
);

const commentLikes = sqliteTable(
  "comment_likes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    commentId: text("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.commentId] })],
);

export {
  authIdentities,
  authOtpChallenges,
  commentLikes,
  comments,
  forumPosts,
  mediaAssetDerivatives,
  mediaAssets,
  places,
  scenePins,
  scenes,
  sessions,
  stories,
  storyLikes,
  storyRevisionMedia,
  storyRevisions,
  users,
};