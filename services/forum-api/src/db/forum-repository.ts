import type {
  ConfirmMediaAssetInput,
  CreateForumPostInput,
  CreateScenePinInput,
  ForumPost,
  ForumPostDetail,
  ListForumPostsInput,
  MediaAsset,
  Scene,
  SceneBootstrap,
  ScenePin,
  UpsertSceneInput,
} from "@ruoshui/shared";
import { and, desc, eq, inArray } from "drizzle-orm";

import { env } from "../env.js";
import { createEntityId } from "../lib/id.js";
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
  const coverAssetId = input.coverAssetId ?? input.mediaAssetIds?.[0];
  const [row] = await db
    .insert(forumPosts)
    .values({
      id: createEntityId("post"),
      sceneId: input.sceneId,
      title: input.title,
      excerpt: input.excerpt,
      body: input.body,
      coverAssetId,
      status: input.status,
    })
    .returning();

  if (input.mediaAssetIds?.length) {
    await db
      .update(mediaAssets)
      .set({
        postId: row.id,
        sceneId: input.sceneId,
        updatedAt: new Date(),
      })
      .where(inArray(mediaAssets.id, input.mediaAssetIds));
  }

  if (input.pinId) {
    await db
      .update(scenePins)
      .set({
        postId: row.id,
        updatedAt: new Date(),
      })
      .where(eq(scenePins.id, input.pinId));
  }

  return {
    ...mapForumPost(row),
    pinId: input.pinId,
    coverAssetId,
  };
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

async function confirmMediaAsset(input: ConfirmMediaAssetInput): Promise<MediaAsset> {
  const [existing] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.objectKey, input.objectKey))
    .limit(1);

  if (existing) {
    const [row] = await db
      .update(mediaAssets)
      .set({
        bucket: input.bucket,
        height: input.height,
        mimeType: input.mimeType,
        postId: input.postId,
        sceneId: input.sceneId,
        sizeBytes: input.sizeBytes,
        status: input.status,
        updatedAt: new Date(),
        width: input.width,
      })
      .where(eq(mediaAssets.id, existing.id))
      .returning();

    return mapMediaAsset(row);
  }

  const [row] = await db
    .insert(mediaAssets)
    .values({
      id: createEntityId("media"),
      bucket: input.bucket,
      objectKey: input.objectKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      width: input.width,
      height: input.height,
      status: input.status,
      sceneId: input.sceneId,
      postId: input.postId,
    })
    .returning();

  return mapMediaAsset(row);
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
  confirmMediaAsset,
  createForumPost,
  createScenePin,
  getForumPostDetail,
  getSceneBootstrap,
  listForumPosts,
  listPinsForPost,
  listPostsForScenePin,
  upsertScene,
};
