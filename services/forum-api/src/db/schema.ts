import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

const postStatusEnum = pgEnum("post_status", ["draft", "published", "archived"]);
const mediaStatusEnum = pgEnum("media_status", ["pending", "ready", "failed"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

const scenes = pgTable("scenes", {
  id: varchar("id", { length: 120 }).primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description"),
  assetUrl: text("asset_url"),
  previewImage: text("preview_image"),
  ...timestamps,
});

const forumPosts = pgTable(
  "forum_posts",
  {
    id: varchar("id", { length: 120 }).primaryKey(),
    sceneId: varchar("scene_id", { length: 120 }).references(() => scenes.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 160 }).notNull(),
    excerpt: varchar("excerpt", { length: 280 }),
    body: text("body").notNull(),
    coverAssetId: varchar("cover_asset_id", { length: 120 }),
    status: postStatusEnum("status").default("draft").notNull(),
    ...timestamps,
  },
  (table) => [index("forum_posts_scene_id_idx").on(table.sceneId)],
);

const scenePins = pgTable(
  "scene_pins",
  {
    id: varchar("id", { length: 120 }).primaryKey(),
    sceneId: varchar("scene_id", { length: 120 })
      .notNull()
      .references(() => scenes.id, { onDelete: "cascade" }),
    postId: varchar("post_id", { length: 120 }).references(() => forumPosts.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 120 }).notNull(),
    summary: varchar("summary", { length: 240 }),
    positionX: real("position_x").notNull(),
    positionY: real("position_y").notNull(),
    positionZ: real("position_z").notNull(),
    targetX: real("target_x"),
    targetY: real("target_y"),
    targetZ: real("target_z"),
    metadata: jsonb("metadata"),
    ...timestamps,
  },
  (table) => [
    index("scene_pins_scene_id_idx").on(table.sceneId),
    uniqueIndex("scene_pins_scene_title_idx").on(table.sceneId, table.title),
  ],
);

const mediaAssets = pgTable(
  "media_assets",
  {
    id: varchar("id", { length: 120 }).primaryKey(),
    sceneId: varchar("scene_id", { length: 120 }).references(() => scenes.id, {
      onDelete: "set null",
    }),
    postId: varchar("post_id", { length: 120 }).references(() => forumPosts.id, {
      onDelete: "set null",
    }),
    objectKey: varchar("object_key", { length: 512 }).notNull(),
    bucket: varchar("bucket", { length: 120 }).notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    status: mediaStatusEnum("status").default("pending").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("media_assets_object_key_idx").on(table.objectKey),
    index("media_assets_post_id_idx").on(table.postId),
  ],
);

const users = pgTable("users", {
  id: varchar("id", { length: 120 }).primaryKey(),
  displayName: varchar("display_name", { length: 80 }),
  ...timestamps,
});

const authIdentities = pgTable(
  "auth_identities",
  {
    id: varchar("id", { length: 120 }).primaryKey(),
    userId: varchar("user_id", { length: 120 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).$type<"email">().notNull(),
    subject: varchar("subject", { length: 320 }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("auth_identities_provider_subject_idx").on(table.provider, table.subject),
    index("auth_identities_user_id_idx").on(table.userId),
  ],
);

const authOtpChallenges = pgTable(
  "auth_otp_challenges",
  {
    id: varchar("id", { length: 120 }).primaryKey(),
    subject: varchar("subject", { length: 320 }).notNull(),
    purpose: varchar("purpose", { length: 40 })
      .$type<"login" | "change_email_current" | "change_email_new">()
      .notNull(),
    codeHash: varchar("code_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    attemptCount: integer("attempt_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("auth_otp_subject_idx").on(table.subject)],
);

const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 120 }).primaryKey(),
    userId: varchar("user_id", { length: 120 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_idx").on(table.tokenHash),
    index("sessions_user_id_idx").on(table.userId),
  ],
);

const places = pgTable(
  "places",
  {
    id: varchar("id", { length: 120 }).primaryKey(),
    sceneId: varchar("scene_id", { length: 120 }).references(() => scenes.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 120 }).notNull(),
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
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("places_scene_id_idx").on(table.sceneId),
    uniqueIndex("places_scene_name_idx").on(table.sceneId, table.name),
  ],
);

const stories = pgTable(
  "stories",
  {
    id: varchar("id", { length: 120 }).primaryKey(),
    authorUserId: varchar("author_user_id", { length: 120 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 32 })
      .$type<"active" | "unpublished" | "deleted">()
      .default("active")
      .notNull(),
    publishedRevisionId: varchar("published_revision_id", { length: 120 }),
    ...timestamps,
  },
  (table) => [index("stories_author_user_id_idx").on(table.authorUserId)],
);

const storyRevisions = pgTable(
  "story_revisions",
  {
    id: varchar("id", { length: 120 }).primaryKey(),
    storyId: varchar("story_id", { length: 120 })
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    createdByUserId: varchar("created_by_user_id", { length: 120 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 32 })
      .$type<"draft" | "pending_review" | "published" | "changes_requested" | "rejected">()
      .default("draft")
      .notNull(),
    title: varchar("title", { length: 160 }),
    body: text("body"),
    memoryTime: varchar("memory_time", { length: 120 }),
    locationKind: varchar("location_kind", { length: 16 })
      .$type<"none" | "place" | "anchor">()
      .default("none")
      .notNull(),
    placeId: varchar("place_id", { length: 120 }).references(() => places.id, {
      onDelete: "set null",
    }),
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

const storyRevisionMedia = pgTable(
  "story_revision_media",
  {
    storyRevisionId: varchar("story_revision_id", { length: 120 })
      .notNull()
      .references(() => storyRevisions.id, { onDelete: "cascade" }),
    mediaAssetId: varchar("media_asset_id", { length: 120 })
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.storyRevisionId, table.mediaAssetId] }),
    uniqueIndex("story_revision_media_order_idx").on(table.storyRevisionId, table.sortOrder),
  ],
);

const comments = pgTable(
  "comments",
  {
    id: varchar("id", { length: 120 }).primaryKey(),
    storyId: varchar("story_id", { length: 120 })
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    authorUserId: varchar("author_user_id", { length: 120 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    rootCommentId: varchar("root_comment_id", { length: 120 }),
    replyToCommentId: varchar("reply_to_comment_id", { length: 120 }),
    body: text("body").notNull(),
    status: varchar("status", { length: 16 })
      .$type<"visible" | "hidden" | "deleted">()
      .default("visible")
      .notNull(),
    ...timestamps,
  },
  (table) => [
    index("comments_story_id_idx").on(table.storyId),
    index("comments_root_comment_id_idx").on(table.rootCommentId),
  ],
);

const storyLikes = pgTable(
  "story_likes",
  {
    userId: varchar("user_id", { length: 120 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyId: varchar("story_id", { length: 120 })
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.storyId] })],
);

const commentLikes = pgTable(
  "comment_likes",
  {
    userId: varchar("user_id", { length: 120 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    commentId: varchar("comment_id", { length: 120 })
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.commentId] })],
);

export {
  authIdentities,
  authOtpChallenges,
  commentLikes,
  comments,
  forumPosts,
  mediaAssets,
  mediaStatusEnum,
  places,
  postStatusEnum,
  scenePins,
  scenes,
  sessions,
  stories,
  storyLikes,
  storyRevisionMedia,
  storyRevisions,
  users,
};
