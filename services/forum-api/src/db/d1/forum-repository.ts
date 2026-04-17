import type {
  CreateForumPostInput,
  CreateScenePinInput,
  ForumPost,
  Scene,
  SceneBootstrap,
  ScenePin,
  UpsertSceneInput,
} from "@ruoshui/shared";
import type { D1Database } from "@cloudflare/workers-types";
import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { createEntityId } from "../../lib/id.js";
import type { ForumRepository } from "../../lib/forum-repository.js";
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

function createD1ForumRepository(database: D1Database): ForumRepository {
  const db = drizzle(database);

  return {
    async checkConnection(): Promise<void> {
      await database.prepare("select 1 as ok").first();
    },

    async upsertScene(input: UpsertSceneInput): Promise<Scene> {
      const now = new Date();

      await db
        .insert(scenes)
        .values({
          id: input.id,
          title: input.title,
          description: input.description ?? null,
          assetUrl: input.assetUrl ?? null,
          previewImage: input.previewImage ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: scenes.id,
          set: {
            title: input.title,
            description: input.description ?? null,
            assetUrl: input.assetUrl ?? null,
            previewImage: input.previewImage ?? null,
            updatedAt: now,
          },
        })
        .run();

      return {
        id: input.id,
        title: input.title,
        description: input.description,
        assetUrl: input.assetUrl,
        previewImage: input.previewImage,
      };
    },

    async createForumPost(input: CreateForumPostInput): Promise<ForumPost> {
      const now = new Date();
      const id = createEntityId("post");

      await db
        .insert(forumPosts)
        .values({
          id,
          sceneId: input.sceneId ?? null,
          title: input.title,
          excerpt: input.excerpt ?? null,
          body: input.body,
          coverAssetId: input.coverAssetId ?? null,
          status: input.status,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      return {
        id,
        sceneId: input.sceneId,
        pinId: undefined,
        title: input.title,
        excerpt: input.excerpt,
        body: input.body,
        coverAssetId: input.coverAssetId,
        status: input.status,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    },

    async createScenePin(input: CreateScenePinInput): Promise<ScenePin> {
      const now = new Date();
      const id = createEntityId("pin");

      await db
        .insert(scenePins)
        .values({
          id,
          sceneId: input.sceneId,
          postId: input.postId ?? null,
          title: input.title,
          summary: input.summary ?? null,
          positionX: input.position.x,
          positionY: input.position.y,
          positionZ: input.position.z,
          targetX: input.target?.x ?? null,
          targetY: input.target?.y ?? null,
          targetZ: input.target?.z ?? null,
          metadata: input.metadata ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      return {
        id,
        sceneId: input.sceneId,
        postId: input.postId,
        title: input.title,
        summary: input.summary,
        position: input.position,
        target: input.target,
      };
    },

    async getSceneBootstrap(sceneId: string): Promise<SceneBootstrap> {
      const sceneRow = await db
        .select()
        .from(scenes)
        .where(eq(scenes.id, sceneId))
        .limit(1)
        .get();

      const pinRows = await db
        .select()
        .from(scenePins)
        .where(eq(scenePins.sceneId, sceneId))
        .orderBy(scenePins.createdAt)
        .all();

      const postIds = pinRows.flatMap((row) => (row.postId ? [row.postId] : []));
      const postRows =
        postIds.length > 0
          ? await db
              .select()
              .from(forumPosts)
              .where(inArray(forumPosts.id, postIds))
              .orderBy(desc(forumPosts.createdAt))
              .all()
          : await db
              .select()
              .from(forumPosts)
              .where(
                and(
                  eq(forumPosts.sceneId, sceneId),
                  eq(forumPosts.status, "published"),
                ),
              )
              .orderBy(desc(forumPosts.createdAt))
              .all();

      return {
        scene: mapScene(sceneRow),
        pins: pinRows.map(mapScenePin),
        posts: postRows.map(mapForumPost),
      };
    },
  };
}

export { createD1ForumRepository };
