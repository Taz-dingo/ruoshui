import type { D1Database } from "@cloudflare/workers-types";

import type {
  OwnedStoryItem,
  OwnedStoryMediaRef,
  OwnedStoryRevisionSummary,
  OwnedStoryWorkState,
  StoryOwnerReadRepository,
} from "../../lib/story-owner-read.js";

interface OwnedStoryRevisionRow {
  storyId: string;
  storyStatus: "active" | "unpublished" | "deleted";
  publishedRevisionId: string | null;
  storyCreatedAt: number;
  storyUpdatedAt: number;
  revisionId: string | null;
  revisionStatus:
    | "draft"
    | "pending_review"
    | "published"
    | "changes_requested"
    | "rejected"
    | null;
  title: string | null;
  body: string | null;
  memoryTime: string | null;
  moderationNote: string | null;
  revisionUpdatedAt: number | null;
  mediaCount: number;
}

const workingStatuses = new Set<OwnedStoryWorkState>([
  "draft",
  "pending_review",
  "changes_requested",
  "rejected",
]);

function bodyPreview(body: string | null): string | null {
  if (!body?.trim()) return null;
  const compact = body.replace(/\s+/g, " ").trim();
  return compact.length > 120 ? `${compact.slice(0, 120)}…` : compact;
}

function mapRevision(row: OwnedStoryRevisionRow): OwnedStoryRevisionSummary | null {
  if (!row.revisionId || !row.revisionStatus || row.revisionUpdatedAt === null) return null;
  if (row.revisionStatus !== "published" && !workingStatuses.has(row.revisionStatus)) {
    return null;
  }
  return {
    id: row.revisionId,
    state: row.revisionStatus,
    title: row.title,
    bodyPreview: bodyPreview(row.body),
    memoryTime: row.memoryTime,
    mediaCount: Number(row.mediaCount ?? 0),
    moderationNote: row.moderationNote,
    updatedAt: new Date(Number(row.revisionUpdatedAt)).toISOString(),
  };
}

function createD1StoryOwnerReadRepository(
  database: D1Database,
): StoryOwnerReadRepository {
  return {
    async getOwnedStoryMediaRef(userId, storyId, mediaAssetId) {
      const row = await database
        .prepare(
          `SELECT
             ma.id AS id,
             ma.mime_type AS mimeType,
             ma.object_key AS objectKey
           FROM stories s
           INNER JOIN story_revisions r ON r.story_id = s.id
           INNER JOIN story_revision_media srm ON srm.story_revision_id = r.id
           INNER JOIN media_assets ma ON ma.id = srm.media_asset_id
           WHERE s.id = ?1
             AND s.author_user_id = ?2
             AND s.status != 'deleted'
             AND srm.media_asset_id = ?3
             AND ma.status = 'ready'
           LIMIT 1`,
        )
        .bind(storyId, userId, mediaAssetId)
        .first<OwnedStoryMediaRef>();
      return row ?? null;
    },

    async listOwnedStories(userId) {
      const rows = await database
        .prepare(
          `SELECT
             s.id AS storyId,
             s.status AS storyStatus,
             s.published_revision_id AS publishedRevisionId,
             s.created_at AS storyCreatedAt,
             s.updated_at AS storyUpdatedAt,
             r.id AS revisionId,
             r.status AS revisionStatus,
             r.title AS title,
             r.body AS body,
             r.memory_time AS memoryTime,
             r.moderation_note AS moderationNote,
             r.updated_at AS revisionUpdatedAt,
             (SELECT COUNT(*) FROM story_revision_media srm WHERE srm.story_revision_id = r.id) AS mediaCount
           FROM stories s
           LEFT JOIN story_revisions r ON r.story_id = s.id
           WHERE s.author_user_id = ?1 AND s.status != 'deleted'
           ORDER BY s.updated_at DESC, r.updated_at DESC`,
        )
        .bind(userId)
        .all<OwnedStoryRevisionRow>();

      const grouped = new Map<string, OwnedStoryRevisionRow[]>();
      for (const row of rows.results ?? []) {
        const group = grouped.get(row.storyId) ?? [];
        group.push(row);
        grouped.set(row.storyId, group);
      }

      const items: OwnedStoryItem[] = [];
      for (const storyRows of grouped.values()) {
        const first = storyRows[0];
        if (!first) continue;

        const publishedRow = first.publishedRevisionId
          ? storyRows.find((row) => row.revisionId === first.publishedRevisionId) ?? null
          : null;
        const publishedRevision = publishedRow ? mapRevision(publishedRow) : null;
        const publishedUpdatedAt = publishedRow?.revisionUpdatedAt ?? -1;

        const workingRow =
          storyRows.find((row) => {
            if (!row.revisionStatus || !workingStatuses.has(row.revisionStatus as OwnedStoryWorkState)) {
              return false;
            }
            if (row.revisionStatus === "rejected" && row.revisionUpdatedAt !== null) {
              return row.revisionUpdatedAt > publishedUpdatedAt;
            }
            return true;
          }) ?? null;

        const publicState =
          first.storyStatus === "unpublished"
            ? "unpublished"
            : first.publishedRevisionId
              ? "published"
              : "never_published";

        items.push({
          id: first.storyId,
          publicState,
          publishedRevision,
          workingRevision: workingRow ? mapRevision(workingRow) : null,
          createdAt: new Date(Number(first.storyCreatedAt)).toISOString(),
          updatedAt: new Date(Number(first.storyUpdatedAt)).toISOString(),
        });
      }

      return items;
    },
  };
}

export { createD1StoryOwnerReadRepository };
