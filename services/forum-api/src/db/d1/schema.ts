import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const scenes = sqliteTable("scenes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  assetUrl: text("asset_url"),
  previewImage: text("preview_image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
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
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
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
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
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
    objectKey: text("object_key").notNull(),
    bucket: text("bucket").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    status: text("status", {
      enum: ["pending", "ready", "failed"],
    }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("media_assets_object_key_idx").on(table.objectKey),
    index("media_assets_post_id_idx").on(table.postId),
  ],
);

export { forumPosts, mediaAssets, scenePins, scenes };
