import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
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

export { forumPosts, mediaAssets, mediaStatusEnum, postStatusEnum, scenePins, scenes };
