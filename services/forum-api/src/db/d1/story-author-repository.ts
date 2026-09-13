import type { Story } from "@ruoshui/shared";
import type { D1Database } from "@cloudflare/workers-types";

import { createEntityId } from "../../lib/id.js";
import type { StoryRepository } from "../../lib/story.js";
import type { StoryAuthorRepository } from "../../lib/story-author.js";

interface OwnedStoryRow {
  id: string;
  authorUserId: string;
  status: "active" | "unpublished" | "deleted";
  publishedRevisionId: string | null;
  createdAt: number;
  updatedAt: number;
}

function mapStory(row: OwnedStoryRow): Story {
  return {
    id: row.id,
    authorUserId: row.authorUserId,
    status: row.status,
    publishedRevisionId: row.publishedRevisionId,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

function createD1StoryAuthorRepository(
  database: D1Database,
  storyRepository: StoryRepository,
): StoryAuthorRepository {
  async function getOwnedStory(userId: string, storyId: string): Promise<OwnedStoryRow | null> {
    return (
      (await database
        .prepare(
          `SELECT
             id,
             author_user_id AS authorUserId,
             status,
             published_revision_id AS publishedRevisionId,
             created_at AS createdAt,
             updated_at AS updatedAt
           FROM stories
           WHERE id = ?1 AND author_user_id = ?2
           LIMIT 1`,
        )
        .bind(storyId, userId)
        .first<OwnedStoryRow>()) ?? null
    );
  }

  return {
    async createDraftFromPublished(userId, storyId, now) {
      const story = await getOwnedStory(userId, storyId);
      if (!story || story.status === "deleted" || !story.publishedRevisionId) {
        return null;
      }

      const conflict = await database
        .prepare(
          `SELECT 1 AS found
           FROM story_revisions
           WHERE story_id = ?1
             AND status IN ('draft', 'changes_requested', 'pending_review')
           LIMIT 1`,
        )
        .bind(storyId)
        .first<{ found: number }>();
      if (conflict?.found) {
        return "conflict";
      }

      const revisionId = createEntityId("revision");
      const timestamp = now.getTime();
      const results = await database.batch([
        database
          .prepare(
            `INSERT INTO story_revisions (
               id, story_id, created_by_user_id, status,
               title, body, memory_time,
               location_kind, place_id,
               anchor_marker_x, anchor_marker_y, anchor_marker_z,
               anchor_camera_x, anchor_camera_y, anchor_camera_z,
               anchor_target_x, anchor_target_y, anchor_target_z, anchor_fov_deg,
               moderation_note, created_at, updated_at
             )
             SELECT
               ?1, r.story_id, ?2, 'draft',
               r.title, r.body, r.memory_time,
               r.location_kind, r.place_id,
               r.anchor_marker_x, r.anchor_marker_y, r.anchor_marker_z,
               r.anchor_camera_x, r.anchor_camera_y, r.anchor_camera_z,
               r.anchor_target_x, r.anchor_target_y, r.anchor_target_z, r.anchor_fov_deg,
               NULL, ?3, ?3
             FROM story_revisions r
             INNER JOIN stories s ON s.published_revision_id = r.id
             WHERE s.id = ?4
               AND s.author_user_id = ?2
               AND s.status != 'deleted'
               AND r.id = ?5
               AND r.status = 'published'`,
          )
          .bind(revisionId, userId, timestamp, storyId, story.publishedRevisionId),
        database
          .prepare(
            `INSERT INTO story_revision_media (story_revision_id, media_asset_id, sort_order)
             SELECT ?1, media_asset_id, sort_order
             FROM story_revision_media
             WHERE story_revision_id = ?2`,
          )
          .bind(revisionId, story.publishedRevisionId),
        database
          .prepare(
            `UPDATE stories
             SET updated_at = ?1
             WHERE id = ?2 AND author_user_id = ?3 AND status != 'deleted'`,
          )
          .bind(timestamp, storyId, userId),
      ]);

      if (!results[0]?.meta?.changes) {
        return null;
      }
      return storyRepository.getDraft(userId, storyId);
    },

    async unpublishStory(userId, storyId, now) {
      const timestamp = now.getTime();
      const result = await database
        .prepare(
          `UPDATE stories
           SET status = 'unpublished', updated_at = ?1
           WHERE id = ?2
             AND author_user_id = ?3
             AND status != 'deleted'
             AND published_revision_id IS NOT NULL`,
        )
        .bind(timestamp, storyId, userId)
        .run();
      if (!result.meta.changes) {
        return null;
      }
      const row = await getOwnedStory(userId, storyId);
      return row ? mapStory(row) : null;
    },

    async softDeleteStory(userId, storyId, now) {
      const timestamp = now.getTime();
      const result = await database
        .prepare(
          `UPDATE stories
           SET status = 'deleted', updated_at = ?1
           WHERE id = ?2 AND author_user_id = ?3 AND status != 'deleted'`,
        )
        .bind(timestamp, storyId, userId)
        .run();
      if (!result.meta.changes) {
        return null;
      }
      const row = await getOwnedStory(userId, storyId);
      return row ? mapStory(row) : null;
    },
  };
}

export { createD1StoryAuthorRepository };
