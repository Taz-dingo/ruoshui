import type {
  CreateForumPostInput,
  CreateScenePinInput,
  ForumPost,
  Scene,
  SceneBootstrap,
  ScenePin,
  UpsertSceneInput,
} from "@ruoshui/shared";
import { and, desc, eq, inArray } from "drizzle-orm";

import { createEntityId } from "../lib/id.js";
import { db } from "./client.js";
import { forumPosts, scenePins, scenes } from "./schema.js";

type SceneRow = typeof scenes.$inferSelect;
type ForumPostRow = typeof forumPosts.$inferSelect;
type ScenePinRow = typeof scenePins.$inferSelect;

function mapScene(row: SceneRow | undefined): Scene | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    assetUrl: row.assetUrl ?? undefined,
    previewImage: row.previewImage ?? undefined,
  };
}

function mapForumPost(row: ForumPostRow): ForumPost {
  return {
    id: row.id,
    sceneId: row.sceneId ?? undefined,
    title: row.title,
    excerpt: row.excerpt ?? undefined,
    body: row.body,
    coverAssetId: row.coverAssetId ?? undefined,
    pinId: undefined,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapScenePin(row: ScenePinRow): ScenePin {
  return {
    id: row.id,
    sceneId: row.sceneId,
    title: row.title,
    summary: row.summary ?? undefined,
    position: {
      x: row.positionX,
      y: row.positionY,
      z: row.positionZ,
    },
    target:
      row.targetX === null || row.targetY === null || row.targetZ === null
        ? undefined
        : {
            x: row.targetX,
            y: row.targetY,
            z: row.targetZ,
          },
    postId: row.postId ?? undefined,
  };
}

async function upsertScene(input: UpsertSceneInput): Promise<Scene> {
  const [row] = await db
    .insert(scenes)
    .values({
      id: input.id,
      title: input.title,
      description: input.description,
      assetUrl: input.assetUrl,
      previewImage: input.previewImage,
    })
    .onConflictDoUpdate({
      target: scenes.id,
      set: {
        title: input.title,
        description: input.description,
        assetUrl: input.assetUrl,
        previewImage: input.previewImage,
        updatedAt: new Date(),
      },
    })
    .returning();

  return mapScene(row)!;
}

async function createForumPost(input: CreateForumPostInput): Promise<ForumPost> {
  const [row] = await db
    .insert(forumPosts)
    .values({
      id: createEntityId("post"),
      sceneId: input.sceneId,
      title: input.title,
      excerpt: input.excerpt,
      body: input.body,
      coverAssetId: input.coverAssetId,
      status: input.status,
    })
    .returning();

  return mapForumPost(row);
}

async function createScenePin(input: CreateScenePinInput): Promise<ScenePin> {
  const [row] = await db
    .insert(scenePins)
    .values({
      id: createEntityId("pin"),
      sceneId: input.sceneId,
      postId: input.postId,
      title: input.title,
      summary: input.summary,
      positionX: input.position.x,
      positionY: input.position.y,
      positionZ: input.position.z,
      targetX: input.target?.x,
      targetY: input.target?.y,
      targetZ: input.target?.z,
      metadata: input.metadata,
    })
    .returning();

  return mapScenePin(row);
}

async function getSceneBootstrap(sceneId: string): Promise<SceneBootstrap> {
  const [sceneRow] = await db.select().from(scenes).where(eq(scenes.id, sceneId)).limit(1);
  const pinRows = await db
    .select()
    .from(scenePins)
    .where(eq(scenePins.sceneId, sceneId))
    .orderBy(scenePins.createdAt);

  const postIds = pinRows.flatMap((row) => (row.postId ? [row.postId] : []));
  const postRows =
    postIds.length > 0
      ? await db
          .select()
          .from(forumPosts)
          .where(inArray(forumPosts.id, postIds))
          .orderBy(desc(forumPosts.createdAt))
      : await db
          .select()
          .from(forumPosts)
          .where(
            and(eq(forumPosts.sceneId, sceneId), eq(forumPosts.status, "published")),
          )
          .orderBy(desc(forumPosts.createdAt));

  return {
    scene: mapScene(sceneRow),
    pins: pinRows.map(mapScenePin),
    posts: postRows.map(mapForumPost),
  };
}

export { createForumPost, createScenePin, getSceneBootstrap, upsertScene };
