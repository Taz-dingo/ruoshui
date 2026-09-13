import type {
  ForumPost,
  ForumPostDetail,
  ListForumPostsInput,
  MediaAsset,
  Scene,
  SceneBootstrap,
  ScenePin,
} from "@ruoshui/shared";
import { and, desc, eq, inArray } from "drizzle-orm";

import { env } from "../env.js";
import { db } from "./client.js";
import { forumPosts, mediaAssets, scenePins, scenes } from "./schema.js";

type SceneRow = typeof scenes.$inferSelect;
type ForumPostRow = typeof forumPosts.$inferSelect;
type MediaAssetRow = typeof mediaAssets.$inferSelect;
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

function buildPublicUrl(objectKey: string): string | undefined {
  const baseUrl = env.MEDIA_PUBLIC_BASE_URL || env.OSS_PUBLIC_BASE_URL;
  if (!baseUrl) {
    return undefined;
  }

  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(objectKey, normalizedBaseUrl).toString();
}

function mapMediaAsset(row: MediaAssetRow): MediaAsset {
  return {
    id: row.id,
    bucket: row.bucket,
    objectKey: row.objectKey,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    publicUrl: buildPublicUrl(row.objectKey),
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
): ForumPostDetail {
  return {
    ...mapForumPost(row),
    pinId: getPrimaryPinId(pinRows),
    mediaAssets: mediaRows.map(mapMediaAsset),
    pins: pinRows.map(mapScenePin),
  };
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

async function listForumPosts(input: ListForumPostsInput): Promise<ForumPostDetail[]> {
  if (input.pinId && input.sceneId) {
    return listPostsForScenePin(input.sceneId, input.pinId);
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

  const postRows = await query.limit(input.limit);
  const postIds = postRows.map((row) => row.id);
  const [pinRows, mediaRows] = await Promise.all([
    postIds.length
      ? db
          .select()
          .from(scenePins)
          .where(inArray(scenePins.postId, postIds))
          .orderBy(scenePins.createdAt)
      : Promise.resolve([]),
    postIds.length
      ? db
          .select()
          .from(mediaAssets)
          .where(and(inArray(mediaAssets.postId, postIds), eq(mediaAssets.status, "ready")))
          .orderBy(mediaAssets.createdAt)
      : Promise.resolve([]),
  ]);

  return postRows.map((postRow) =>
    buildPostDetail(
      postRow,
      pinRows.filter((pinRow) => pinRow.postId === postRow.id),
      mediaRows.filter((mediaRow) => mediaRow.postId === postRow.id),
    ),
  );
}

async function getForumPostDetail(postId: string): Promise<ForumPostDetail | null> {
  const [postRow] = await db.select().from(forumPosts).where(eq(forumPosts.id, postId)).limit(1);

  if (!postRow) {
    return null;
  }

  const [pinRows, mediaRows] = await Promise.all([
    db.select().from(scenePins).where(eq(scenePins.postId, postId)).orderBy(scenePins.createdAt),
    db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.postId, postId), eq(mediaAssets.status, "ready")))
      .orderBy(mediaAssets.createdAt),
  ]);

  return buildPostDetail(postRow, pinRows, mediaRows);
}

async function listPostsForScenePin(sceneId: string, pinId: string): Promise<ForumPostDetail[]> {
  const [pinRow] = await db
    .select()
    .from(scenePins)
    .where(and(eq(scenePins.sceneId, sceneId), eq(scenePins.id, pinId)))
    .limit(1);

  if (!pinRow?.postId) {
    return [];
  }

  const detail = await getForumPostDetail(pinRow.postId);
  return detail ? [detail] : [];
}

async function listPinsForPost(postId: string): Promise<ScenePin[]> {
  const pinRows = await db
    .select()
    .from(scenePins)
    .where(eq(scenePins.postId, postId))
    .orderBy(scenePins.createdAt);

  return pinRows.map(mapScenePin);
}

export {
  getForumPostDetail,
  getSceneBootstrap,
  listForumPosts,
  listPinsForPost,
  listPostsForScenePin,
};
