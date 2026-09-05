import type { D1Database } from "@cloudflare/workers-types";

import type {
  CommentModerationItem,
  CommentModerationRepository,
} from "../../lib/comment-moderation.js";

interface ModerationCommentRow {
  id: string;
  storyId: string;
  storyTitle: string | null;
  authorUserId: string;
  displayName: string | null;
  rootCommentId: string | null;
  replyToCommentId: string | null;
  body: string;
  status: "visible" | "hidden" | "deleted";
  createdAt: number;
  updatedAt: number;
}

function mapRow(row: ModerationCommentRow): CommentModerationItem {
  return {
    id: row.id,
    storyId: row.storyId,
    storyTitle: row.storyTitle,
    author: {
      id: row.authorUserId,
      displayName: row.displayName,
    },
    rootCommentId: row.rootCommentId,
    replyToCommentId: row.replyToCommentId,
    body: row.body,
    status: row.status,
    createdAt: new Date(Number(row.createdAt)).toISOString(),
    updatedAt: new Date(Number(row.updatedAt)).toISOString(),
  };
}

function createD1CommentModerationRepository(
  database: D1Database,
): CommentModerationRepository {
  async function getComment(commentId: string): Promise<CommentModerationItem | null> {
    const row = await database
      .prepare(
        `SELECT
           c.id AS id,
           c.story_id AS storyId,
           pr.title AS storyTitle,
           c.author_user_id AS authorUserId,
           u.display_name AS displayName,
           c.root_comment_id AS rootCommentId,
           c.reply_to_comment_id AS replyToCommentId,
           c.body AS body,
           c.status AS status,
           c.created_at AS createdAt,
           c.updated_at AS updatedAt
         FROM comments c
         INNER JOIN users u ON u.id = c.author_user_id
         INNER JOIN stories s ON s.id = c.story_id
         LEFT JOIN story_revisions pr ON pr.id = s.published_revision_id
         WHERE c.id = ?1 AND c.status != 'deleted'
         LIMIT 1`,
      )
      .bind(commentId)
      .first<ModerationCommentRow>();
    return row ? mapRow(row) : null;
  }

  return {
    async listComments(limit) {
      const rows = await database
        .prepare(
          `SELECT
             c.id AS id,
             c.story_id AS storyId,
             pr.title AS storyTitle,
             c.author_user_id AS authorUserId,
             u.display_name AS displayName,
             c.root_comment_id AS rootCommentId,
             c.reply_to_comment_id AS replyToCommentId,
             c.body AS body,
             c.status AS status,
             c.created_at AS createdAt,
             c.updated_at AS updatedAt
           FROM comments c
           INNER JOIN users u ON u.id = c.author_user_id
           INNER JOIN stories s ON s.id = c.story_id
           LEFT JOIN story_revisions pr ON pr.id = s.published_revision_id
           WHERE c.status != 'deleted'
           ORDER BY c.created_at DESC
           LIMIT ?1`,
        )
        .bind(limit)
        .all<ModerationCommentRow>();
      return (rows.results ?? []).map(mapRow);
    },

    async setCommentStatus(commentId, status, now) {
      const current = await getComment(commentId);
      if (!current) return null;
      if (current.status === status) return current;

      await database
        .prepare(
          `UPDATE comments
           SET status = ?1, updated_at = ?2
           WHERE id = ?3 AND status != 'deleted'`,
        )
        .bind(status, now.getTime(), commentId)
        .run();
      return getComment(commentId);
    },
  };
}

export { createD1CommentModerationRepository };
