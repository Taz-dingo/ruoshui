import type {
  ForumPost,
  ForumPostDetail,
  ListForumPostsInput,
  MediaAsset,
  Scene,
  SceneBootstrap,
  ScenePin,
} from "@ruoshui/shared";
import type { D1Database } from "@cloudflare/workers-types";
import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import type { ForumRepository } from "../../lib/forum-repository.js";
import { forumPosts, mediaAssets, scenePins, scenes } from "./schema.js";

type SceneRow = typeof scenes.$inferSelect;
type ForumPostRow = typeof forumPosts.$inferSelect;
type MediaAssetRow = typeof mediaAssets.$inferSelect;
type ScenePinRow = typeof scenePins.$inferSelect;

interface CreateD1ForumRepositoryOptions {
  mediaPublicBaseUrl?: string;
}

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

function buildPublicUrl(
  mediaPublicBaseUrl: string | undefined,
  objectKey: string,
): string | undefined {
  if (!mediaPublicBaseUrl) {
    return undefined;
  }

  const normalizedBaseUrl = mediaPublicBaseUrl.endsWith("/")
    ? mediaPublicBaseUrl
    : `${mediaPublicBaseUrl}/`;
  return new URL(objectKey, normalizedBaseUrl).toString();
}

function mapMediaAsset(
  row: MediaAssetRow,
  mediaPublicBaseUrl: string | undefined,
): MediaAsset {
  return {
    id: row.id,
    bucket: row.bucket,
    objectKey: row.objectKey,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    publicUrl: buildPublicUrl(mediaPublicBaseUrl, row.objectKey),
    status: row.status,
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

function getPrimaryPinId(pinRows: ScenePinRow[]): string | undefined {
  return pinRows[0]?.id;
}

function buildPostDetail(
  row: ForumPostRow,
  pinRows: ScenePinRow[],
  mediaRows: MediaAssetRow[],
  mediaPublicBaseUrl: string | undefined,
): ForumPostDetail {
  return {
    ...mapForumPost(row),
    pinId: getPrimaryPinId(pinRows),
    mediaAssets: mediaRows.map((mediaRow) => mapMediaAsset(mediaRow, mediaPublicBaseUrl)),
    pins: pinRows.map(mapScenePin),
  };
}

function createD1ForumRepository(
  database: D1Database,
  options: CreateD1ForumRepositoryOptions = {},
): ForumRepository {
  const db = drizzle(database);
  const mediaPublicBaseUrl = options.mediaPublicBaseUrl;

  async function listPinsByPostIds(postIds: string[]): Promise<ScenePinRow[]> {
    if (postIds.length === 0) {
      return [];
    }

    return db
      .select()
      .from(scenePins)
      .where(inArray(scenePins.postId, postIds))
      .orderBy(scenePins.createdAt)
      .all();
  }

  async function listReadyMediaByPostIds(postIds: string[]): Promise<MediaAssetRow[]> {
    if (postIds.length === 0) {
      return [];
    }

    return db
      .select()
      .from(mediaAssets)
      .where(and(inArray(mediaAssets.postId, postIds), eq(mediaAssets.status, "ready")))
      .orderBy(mediaAssets.createdAt)
      .all();
  }

  return {
    async checkConnection(): Promise<void> {
      await database.prepare("select 1 as ok").first();
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

    async listForumPosts(input: ListForumPostsInput): Promise<ForumPostDetail[]> {
      if (input.pinId && input.sceneId) {
        return this.listPostsForScenePin(input.sceneId, input.pinId);
      }

      let query = db.select().from(forumPosts).orderBy(desc(forumPosts.createdAt)).$dynamic();

      if (input.sceneId && input.status) {
        query = query.where(
          and(eq(forumPosts.sceneId, input.sceneId), eq(forumPosts.status, input.status)),
        );
      } else if (input.sceneId) {
        query = query.where(eq(forumPosts.sceneId, input.sceneId));
      } else if (input.status) {
        query = query.where(eq(forumPosts.status, input.status));
      }

      const postRows = await query.limit(input.limit).all();
      const postIds = postRows.map((row) => row.id);
      const [pinRows, mediaRows] = await Promise.all([
        listPinsByPostIds(postIds),
        listReadyMediaByPostIds(postIds),
      ]);

      return postRows.map((postRow) =>
        buildPostDetail(
          postRow,
          pinRows.filter((pinRow) => pinRow.postId === postRow.id),
          mediaRows.filter((mediaRow) => mediaRow.postId === postRow.id),
          mediaPublicBaseUrl,
        ),
      );
    },

    async getForumPostDetail(postId: string): Promise<ForumPostDetail | null> {
      const postRow = await db
        .select()
        .from(forumPosts)
        .where(eq(forumPosts.id, postId))
        .limit(1)
        .get();

      if (!postRow) {
        return null;
      }

      const [pinRows, mediaRows] = await Promise.all([
        db
          .select()
          .from(scenePins)
          .where(eq(scenePins.postId, postId))
          .orderBy(scenePins.createdAt)
          .all(),
        db
          .select()
          .from(mediaAssets)
          .where(and(eq(mediaAssets.postId, postId), eq(mediaAssets.status, "ready")))
          .orderBy(mediaAssets.createdAt)
          .all(),
      ]);

      return buildPostDetail(postRow, pinRows, mediaRows, mediaPublicBaseUrl);
    },

    async listPostsForScenePin(sceneId: string, pinId: string): Promise<ForumPostDetail[]> {
      const pinRow = await db
        .select()
        .from(scenePins)
        .where(and(eq(scenePins.sceneId, sceneId), eq(scenePins.id, pinId)))
        .limit(1)
        .get();

      if (!pinRow?.postId) {
        return [];
      }

      const postDetail = await this.getForumPostDetail(pinRow.postId);
      return postDetail ? [postDetail] : [];
    },

    async listPinsForPost(postId: string): Promise<ScenePin[]> {
      const pinRows = await db
        .select()
        .from(scenePins)
        .where(eq(scenePins.postId, postId))
        .orderBy(scenePins.createdAt)
        .all();

      return pinRows.map(mapScenePin);
    },
  };
}

export { createD1ForumRepository };
