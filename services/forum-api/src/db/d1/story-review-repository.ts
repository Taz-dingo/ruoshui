import type {
  Story,
  StoryLocation,
  StoryReviewItem,
  StoryReviewPatch,
  StoryRevision,
  User,
} from "@ruoshui/shared";
import type { D1Database } from "@cloudflare/workers-types";
import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import type { StoryReviewRepository } from "../../lib/story-review.js";
import {
  mediaAssets,
  stories,
  storyRevisionMedia,
  storyRevisions,
  users,
} from "./schema.js";

type StoryRow = typeof stories.$inferSelect;
type StoryRevisionRow = typeof storyRevisions.$inferSelect;
type UserRow = typeof users.$inferSelect;

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

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    displayName: row.displayName,
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

function locationColumns(location: StoryLocation) {
  if (location.kind === "none") {
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

function createD1StoryReviewRepository(database: D1Database): StoryReviewRepository {
  const db = drizzle(database);

  async function loadMediaIds(revisionId: string): Promise<string[]> {
    const rows = await db
      .select({ mediaAssetId: storyRevisionMedia.mediaAssetId })
      .from(storyRevisionMedia)
      .where(eq(storyRevisionMedia.storyRevisionId, revisionId))
      .orderBy(asc(storyRevisionMedia.sortOrder))
      .all();
    return rows.map((row) => row.mediaAssetId);
  }

  async function hydrateRow(row: {
    story: StoryRow;
    revision: StoryRevisionRow;
    author: UserRow;
  }): Promise<StoryReviewItem> {
    return {
      story: mapStory(row.story),
      revision: mapRevision(row.revision, await loadMediaIds(row.revision.id)),
      author: mapUser(row.author),
    };
  }

  async function getJoinedRevision(revisionId: string) {
    const [row] = await db
      .select({ story: stories, revision: storyRevisions, author: users })
      .from(storyRevisions)
      .innerJoin(stories, eq(stories.id, storyRevisions.storyId))
      .innerJoin(users, eq(users.id, stories.authorUserId))
      .where(eq(storyRevisions.id, revisionId))
      .limit(1)
      .all();
    return row ?? null;
  }

  return {
    async getReviewItem(revisionId) {
      const row = await getJoinedRevision(revisionId);
      return row ? hydrateRow(row) : null;
    },

    async getReviewMediaRef(revisionId, mediaAssetId) {
      const [row] = await db
        .select({
          id: mediaAssets.id,
          mimeType: mediaAssets.mimeType,
          objectKey: mediaAssets.objectKey,
        })
        .from(storyRevisionMedia)
        .innerJoin(mediaAssets, eq(mediaAssets.id, storyRevisionMedia.mediaAssetId))
        .where(
          and(
            eq(storyRevisionMedia.storyRevisionId, revisionId),
            eq(storyRevisionMedia.mediaAssetId, mediaAssetId),
            eq(mediaAssets.status, "ready"),
          ),
        )
        .limit(1)
        .all();
      return row ?? null;
    },

    async listPendingReviews() {
      const rows = await db
        .select({ story: stories, revision: storyRevisions, author: users })
        .from(storyRevisions)
        .innerJoin(stories, eq(stories.id, storyRevisions.storyId))
        .innerJoin(users, eq(users.id, stories.authorUserId))
        .where(eq(storyRevisions.status, "pending_review"))
        .orderBy(asc(storyRevisions.updatedAt))
        .all();
      return Promise.all(rows.map(hydrateRow));
    },

    async patchPendingRevision(revisionId, input: StoryReviewPatch, now) {
      const assignments = ["updated_at = ?1"];
      const values: unknown[] = [now.getTime()];
      let placeholderIndex = 2;
      const add = (column: string, value: unknown) => {
        assignments.push(`${column} = ?${placeholderIndex}`);
        values.push(value);
        placeholderIndex += 1;
      };

      if (input.title !== undefined) add("title", input.title || null);
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

      values.push(revisionId);
      const result = await database
        .prepare(
          `UPDATE story_revisions
           SET ${assignments.join(", ")}
           WHERE id = ?${placeholderIndex} AND status = 'pending_review'`,
        )
        .bind(...values)
        .run();
      if (!result.meta.changes) {
        return null;
      }
      return this.getReviewItem(revisionId);
    },

    async approveRevision(revisionId, now) {
      const timestamp = now.getTime();
      const results = await database.batch([
        database
          .prepare(
            `UPDATE story_revisions
             SET status = 'published', moderation_note = NULL, updated_at = ?1
             WHERE id = ?2 AND status = 'pending_review'`,
          )
          .bind(timestamp, revisionId),
        database
          .prepare(
            `UPDATE stories
             SET published_revision_id = ?1, status = 'active', updated_at = ?2
             WHERE id = (
               SELECT story_id FROM story_revisions
               WHERE id = ?1 AND status = 'published'
             ) AND status != 'deleted'`,
          )
          .bind(revisionId, timestamp),
      ]);

      if (!results[0]?.meta?.changes || !results[1]?.meta?.changes) {
        return null;
      }
      return this.getReviewItem(revisionId);
    },

    async requestChanges(revisionId, note, now) {
      const result = await database
        .prepare(
          `UPDATE story_revisions
           SET status = 'changes_requested', moderation_note = ?1, updated_at = ?2
           WHERE id = ?3 AND status = 'pending_review'`,
        )
        .bind(note, now.getTime(), revisionId)
        .run();
      if (!result.meta.changes) {
        return null;
      }
      return this.getReviewItem(revisionId);
    },

    async rejectRevision(revisionId, note, now) {
      const result = await database
        .prepare(
          `UPDATE story_revisions
           SET status = 'rejected', moderation_note = ?1, updated_at = ?2
           WHERE id = ?3 AND status = 'pending_review'`,
        )
        .bind(note ?? null, now.getTime(), revisionId)
        .run();
      if (!result.meta.changes) {
        return null;
      }
      return this.getReviewItem(revisionId);
    },
  };
}

export { createD1StoryReviewRepository };
