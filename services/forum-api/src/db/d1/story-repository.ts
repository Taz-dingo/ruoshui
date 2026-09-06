import type {
  CreateStoryDraftInput,
  Story,
  StoryDraft,
  StoryDraftPatch,
  StoryLocation,
  StoryRevision,
} from "@ruoshui/shared";
import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { createEntityId } from "../../lib/id.js";
import type { StoryRepository } from "../../lib/story.js";
import {
  mediaAssets,
  stories,
  storyRevisionMedia,
  storyRevisions,
} from "./schema.js";

type StoryRow = typeof stories.$inferSelect;
type StoryRevisionRow = typeof storyRevisions.$inferSelect;

const editableRevisionStatuses = ["draft", "changes_requested"] as const;

function mapStory(row: StoryRow): Story {
  return {
    id: row.id,
    authorUserId: row.authorUserId,
    status: row.status,
    publishedRevisionId: row.publishedRevisionId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapLocation(row: StoryRevisionRow): StoryLocation {
  if (row.locationKind === "place") {
    if (!row.placeId) {
      throw new Error(`Story revision ${row.id} has an invalid place location.`);
    }
    return { kind: "place", placeId: row.placeId };
  }

  if (row.locationKind === "anchor") {
    const values = [
      row.anchorMarkerX,
      row.anchorMarkerY,
      row.anchorMarkerZ,
      row.anchorCameraX,
      row.anchorCameraY,
      row.anchorCameraZ,
      row.anchorTargetX,
      row.anchorTargetY,
      row.anchorTargetZ,
    ];
    if (values.some((value) => value === null)) {
      throw new Error(`Story revision ${row.id} has an incomplete custom anchor.`);
    }

    return {
      kind: "anchor",
      anchor: {
        markerPosition: {
          x: row.anchorMarkerX as number,
          y: row.anchorMarkerY as number,
          z: row.anchorMarkerZ as number,
        },
        cameraPose: {
          position: {
            x: row.anchorCameraX as number,
            y: row.anchorCameraY as number,
            z: row.anchorCameraZ as number,
          },
          target: {
            x: row.anchorTargetX as number,
            y: row.anchorTargetY as number,
            z: row.anchorTargetZ as number,
          },
          ...(row.anchorFovDeg === null ? {} : { fovDeg: row.anchorFovDeg }),
        },
      },
    };
  }

  return { kind: "none" };
}

function mapRevision(row: StoryRevisionRow, mediaAssetIds: string[]): StoryRevision {
  return {
    id: row.id,
    storyId: row.storyId,
    status: row.status,
    createdByUserId: row.createdByUserId,
    title: row.title ?? undefined,
    body: row.body ?? undefined,
    memoryTime: row.memoryTime ?? undefined,
    mediaAssetIds,
    location: mapLocation(row),
    moderationNote: row.moderationNote,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function locationColumns(location: StoryLocation | undefined) {
  if (!location || location.kind === "none") {
    return {
      locationKind: "none" as const,
      placeId: null,
      anchorMarkerX: null,
      anchorMarkerY: null,
      anchorMarkerZ: null,
      anchorCameraX: null,
      anchorCameraY: null,
      anchorCameraZ: null,
      anchorTargetX: null,
      anchorTargetY: null,
      anchorTargetZ: null,
      anchorFovDeg: null,
    };
  }

  if (location.kind === "place") {
    return {
      locationKind: "place" as const,
      placeId: location.placeId,
      anchorMarkerX: null,
      anchorMarkerY: null,
      anchorMarkerZ: null,
      anchorCameraX: null,
      anchorCameraY: null,
      anchorCameraZ: null,
      anchorTargetX: null,
      anchorTargetY: null,
      anchorTargetZ: null,
      anchorFovDeg: null,
    };
  }

  return {
    locationKind: "anchor" as const,
    placeId: null,
    anchorMarkerX: location.anchor.markerPosition.x,
    anchorMarkerY: location.anchor.markerPosition.y,
    anchorMarkerZ: location.anchor.markerPosition.z,
    anchorCameraX: location.anchor.cameraPose.position.x,
    anchorCameraY: location.anchor.cameraPose.position.y,
    anchorCameraZ: location.anchor.cameraPose.position.z,
    anchorTargetX: location.anchor.cameraPose.target.x,
    anchorTargetY: location.anchor.cameraPose.target.y,
    anchorTargetZ: location.anchor.cameraPose.target.z,
    anchorFovDeg: location.anchor.cameraPose.fovDeg ?? null,
  };
}

function createD1StoryRepository(database: D1Database): StoryRepository {
  const db = drizzle(database);

  async function loadMediaByRevisionIds(
    revisionIds: string[],
  ): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    if (revisionIds.length === 0) {
      return result;
    }

    const rows = await db
      .select()
      .from(storyRevisionMedia)
      .where(inArray(storyRevisionMedia.storyRevisionId, revisionIds))
      .orderBy(storyRevisionMedia.storyRevisionId, storyRevisionMedia.sortOrder)
      .all();

    for (const row of rows) {
      const media = result.get(row.storyRevisionId) ?? [];
      media.push(row.mediaAssetId);
      result.set(row.storyRevisionId, media);
    }
    return result;
  }

  async function loadDraftRows(userId: string, storyId?: string) {
    const filters = [
      eq(stories.authorUserId, userId),
      ne(stories.status, "deleted"),
      inArray(storyRevisions.status, [...editableRevisionStatuses]),
    ];
    if (storyId) {
      filters.push(eq(stories.id, storyId));
    }

    return db
      .select({ story: stories, revision: storyRevisions })
      .from(stories)
      .innerJoin(storyRevisions, eq(storyRevisions.storyId, stories.id))
      .where(and(...filters))
      .orderBy(desc(storyRevisions.updatedAt))
      .all();
  }

  async function hydrateDrafts(
    rows: Array<{ story: StoryRow; revision: StoryRevisionRow }>,
  ): Promise<StoryDraft[]> {
    const media = await loadMediaByRevisionIds(rows.map((row) => row.revision.id));
    return rows.map((row) => ({
      story: mapStory(row.story),
      revision: mapRevision(row.revision, media.get(row.revision.id) ?? []),
    }));
  }

  function createRevisionMediaStatements(
    revisionId: string,
    mediaAssetIds: string[],
  ): D1PreparedStatement[] {
    return mediaAssetIds.map((mediaAssetId, sortOrder) =>
      database
        .prepare(
          "INSERT INTO story_revision_media (story_revision_id, media_asset_id, sort_order) VALUES (?1, ?2, ?3)",
        )
        .bind(revisionId, mediaAssetId, sortOrder),
    );
  }

  function createDerivativeStatements(
    mediaAssetId: string,
    derivatives: NonNullable<Parameters<StoryRepository["confirmMediaAssetForUser"]>[1]["derivatives"]>,
    now: Date,
  ): D1PreparedStatement[] {
    return derivatives.map((derivative) =>
      database
        .prepare(
          `INSERT INTO media_asset_derivatives (
            media_asset_id, variant, object_key, mime_type, size_bytes, width, height,
            created_at, updated_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
          ON CONFLICT(media_asset_id, variant) DO UPDATE SET
            object_key = excluded.object_key,
            mime_type = excluded.mime_type,
            size_bytes = excluded.size_bytes,
            width = excluded.width,
            height = excluded.height,
            updated_at = excluded.updated_at`,
        )
        .bind(
          mediaAssetId,
          derivative.variant,
          derivative.objectKey,
          derivative.mimeType,
          derivative.sizeBytes,
          derivative.width,
          derivative.height,
          now.getTime(),
        ),
    );
  }

  async function countOwnedMedia(userId: string, mediaAssetIds: string[], readyOnly: boolean) {
    const uniqueIds = [...new Set(mediaAssetIds)];
    if (uniqueIds.length === 0) {
      return 0;
    }

    const placeholders = uniqueIds.map((_, index) => `?${index + 2}`).join(", ");
    const statusFilter = readyOnly ? " AND status = 'ready'" : "";
    const row = await database
      .prepare(
        `SELECT COUNT(*) AS count FROM media_assets
         WHERE owner_user_id = ?1 AND id IN (${placeholders})${statusFilter}`,
      )
      .bind(userId, ...uniqueIds)
      .first<{ count: number }>();

    return Number(row?.count ?? 0);
  }

  return {
    async createDraft(userId, input, now) {
      const storyId = createEntityId("story");
      const revisionId = createEntityId("revision");
      const location = locationColumns(input.location);
      const mediaAssetIds = input.mediaAssetIds ?? [];
      const timestamp = now.getTime();

      await database.batch([
        database
          .prepare(
            "INSERT INTO stories (id, author_user_id, status, published_revision_id, created_at, updated_at) VALUES (?1, ?2, 'active', NULL, ?3, ?3)",
          )
          .bind(storyId, userId, timestamp),
        database
          .prepare(
            `INSERT INTO story_revisions (
              id, story_id, created_by_user_id, status, title, body, memory_time,
              location_kind, place_id,
              anchor_marker_x, anchor_marker_y, anchor_marker_z,
              anchor_camera_x, anchor_camera_y, anchor_camera_z,
              anchor_target_x, anchor_target_y, anchor_target_z, anchor_fov_deg,
              moderation_note, created_at, updated_at
            ) VALUES (
              ?1, ?2, ?3, 'draft', ?4, ?5, ?6,
              ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18,
              NULL, ?19, ?19
            )`,
          )
          .bind(
            revisionId,
            storyId,
            userId,
            input.title ?? null,
            input.body ?? null,
            input.memoryTime ?? null,
            location.locationKind,
            location.placeId,
            location.anchorMarkerX,
            location.anchorMarkerY,
            location.anchorMarkerZ,
            location.anchorCameraX,
            location.anchorCameraY,
            location.anchorCameraZ,
            location.anchorTargetX,
            location.anchorTargetY,
            location.anchorTargetZ,
            location.anchorFovDeg,
            timestamp,
          ),
        ...createRevisionMediaStatements(revisionId, mediaAssetIds),
      ]);

      const created = await this.getDraft(userId, storyId);
      if (!created) {
        throw new Error("Failed to read newly created Story draft.");
      }
      return created;
    },

    async getDraft(userId, storyId) {
      const rows = await loadDraftRows(userId, storyId);
      const drafts = await hydrateDrafts(rows.slice(0, 1));
      return drafts[0] ?? null;
    },

    async listDrafts(userId) {
      return hydrateDrafts(await loadDraftRows(userId));
    },

    async updateDraft(userId, storyId, input, now) {
      const current = await this.getDraft(userId, storyId);
      if (!current) {
        return null;
      }

      const assignments = ["updated_at = ?", "status = 'draft'", "moderation_note = NULL"];
      const values: unknown[] = [now.getTime()];
      const add = (column: string, value: unknown) => {
        assignments.push(`${column} = ?`);
        values.push(value);
      };

      if (input.title !== undefined) add("title", input.title || null);
      if (input.body !== undefined) add("body", input.body || null);
      if (input.memoryTime !== undefined) add("memory_time", input.memoryTime || null);

      if (input.location !== undefined) {
        const location = locationColumns(input.location);
        add("location_kind", location.locationKind);
        add("place_id", location.placeId);
        add("anchor_marker_x", location.anchorMarkerX);
        add("anchor_marker_y", location.anchorMarkerY);
        add("anchor_marker_z", location.anchorMarkerZ);
        add("anchor_camera_x", location.anchorCameraX);
        add("anchor_camera_y", location.anchorCameraY);
        add("anchor_camera_z", location.anchorCameraZ);
        add("anchor_target_x", location.anchorTargetX);
        add("anchor_target_y", location.anchorTargetY);
        add("anchor_target_z", location.anchorTargetZ);
        add("anchor_fov_deg", location.anchorFovDeg);
      }

      values.push(current.revision.id);
      const revisionUpdate = database
        .prepare(
          `UPDATE story_revisions SET ${assignments.join(", ")}
           WHERE id = ? AND status IN ('draft', 'changes_requested')`,
        )
        .bind(...values);

      const statements: D1PreparedStatement[] = [
        revisionUpdate,
        database
          .prepare("UPDATE stories SET updated_at = ?1 WHERE id = ?2 AND author_user_id = ?3")
          .bind(now.getTime(), storyId, userId),
      ];

      if (input.mediaAssetIds !== undefined) {
        statements.push(
          database
            .prepare("DELETE FROM story_revision_media WHERE story_revision_id = ?1")
            .bind(current.revision.id),
          ...createRevisionMediaStatements(current.revision.id, input.mediaAssetIds),
        );
      }

      await database.batch(statements);
      return this.getDraft(userId, storyId);
    },

    async markDraftPendingReview(userId, storyId, revisionId, now) {
      const current = await this.getDraft(userId, storyId);
      if (!current || current.revision.id !== revisionId) {
        return null;
      }

      const results = await database.batch([
        database
          .prepare(
            "UPDATE story_revisions SET status = 'pending_review', updated_at = ?1 WHERE id = ?2 AND story_id = ?3 AND status IN ('draft', 'changes_requested')",
          )
          .bind(now.getTime(), revisionId, storyId),
        database
          .prepare("UPDATE stories SET updated_at = ?1 WHERE id = ?2 AND author_user_id = ?3")
          .bind(now.getTime(), storyId, userId),
      ]);

      if (!results[0]?.meta?.changes) {
        return null;
      }

      const updatedAt = now.toISOString();
      return {
        story: { ...current.story, updatedAt },
        revision: {
          ...current.revision,
          status: "pending_review",
          moderationNote: null,
          updatedAt,
        },
      };
    },

    async areMediaAssetsOwnedByUser(userId, mediaAssetIds) {
      const uniqueIds = [...new Set(mediaAssetIds)];
      if (uniqueIds.length === 0) {
        return true;
      }
      return (await countOwnedMedia(userId, uniqueIds, false)) === uniqueIds.length;
    },

    async areMediaAssetsReadyForUser(userId, mediaAssetIds) {
      const uniqueIds = [...new Set(mediaAssetIds)];
      if (uniqueIds.length === 0) {
        return true;
      }
      return (await countOwnedMedia(userId, uniqueIds, true)) === uniqueIds.length;
    },

    async confirmMediaAssetForUser(userId, input, now) {
      const existing = await database
        .prepare("SELECT id, owner_user_id AS ownerUserId FROM media_assets WHERE object_key = ?1 LIMIT 1")
        .bind(input.objectKey)
        .first<{ id: string; ownerUserId: string | null }>();

      if (existing?.ownerUserId && existing.ownerUserId !== userId) {
        throw new Error("Media asset is already owned by another user.");
      }

      const mediaAssetId = existing?.id ?? createEntityId("media");
      const derivativeStatements = createDerivativeStatements(
        mediaAssetId,
        input.derivatives ?? [],
        now,
      );

      if (existing) {
        await database.batch([
          database
            .prepare(
              `UPDATE media_assets SET
                owner_user_id = ?1, bucket = ?2, mime_type = ?3, size_bytes = ?4,
                width = ?5, height = ?6, status = ?7, updated_at = ?8
               WHERE id = ?9 AND (owner_user_id IS NULL OR owner_user_id = ?1)`,
            )
            .bind(
              userId,
              input.bucket,
              input.mimeType,
              input.sizeBytes,
              input.width ?? null,
              input.height ?? null,
              input.status,
              now.getTime(),
              mediaAssetId,
            ),
          ...derivativeStatements,
        ]);
        return mediaAssetId;
      }

      await database.batch([
        database
          .prepare(
            `INSERT INTO media_assets (
              id, scene_id, post_id, owner_user_id, object_key, bucket, mime_type,
              size_bytes, width, height, status, created_at, updated_at
            ) VALUES (?1, NULL, NULL, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)`,
          )
          .bind(
            mediaAssetId,
            userId,
            input.objectKey,
            input.bucket,
            input.mimeType,
            input.sizeBytes,
            input.width ?? null,
            input.height ?? null,
            input.status,
            now.getTime(),
          ),
        ...derivativeStatements,
      ]);
      return mediaAssetId;
    },
  };
}

export { createD1StoryRepository };