import type { StorySocial } from "@ruoshui/shared";
import type { D1Database } from "@cloudflare/workers-types";

import { createEntityId } from "../../lib/id.js";
import type {
  CreateSocialCommentRecord,
  StorySocialRepository,
} from "../../lib/story-social.js";

interface CommentRow {
  id: string;
  storyId: string;
  authorUserId: string;
  displayName: string | null;
  rootCommentId: string | null;
  replyToCommentId: string | null;
  body: string;
  createdAt: number;
  likeCount: number;
  viewerHasLiked: number;
}

function createD1StorySocialRepository(database: D1Database): StorySocialRepository {
  async function getSocial(storyId: string, viewerUserId?: string): Promise<StorySocial> {
    const likeCountRow = await database
      .prepare("SELECT COUNT(*) AS count FROM story_likes WHERE story_id = ?1")
      .bind(storyId)
      .first<{ count: number }>();

    const viewerLikeRow = viewerUserId
      ? await database
          .prepare(
            "SELECT 1 AS liked FROM story_likes WHERE story_id = ?1 AND user_id = ?2 LIMIT 1",
          )
          .bind(storyId, viewerUserId)
          .first<{ liked: number }>()
      : null;

    const viewerCommentLikeExpression = viewerUserId
      ? "EXISTS(SELECT 1 FROM comment_likes clv WHERE clv.comment_id = c.id AND clv.user_id = ?2)"
      : "0";
    const commentsStatement = database.prepare(
      `SELECT
         c.id AS id,
         c.story_id AS storyId,
         c.author_user_id AS authorUserId,
         u.display_name AS displayName,
         c.root_comment_id AS rootCommentId,
         c.reply_to_comment_id AS replyToCommentId,
         c.body AS body,
         c.created_at AS createdAt,
         (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) AS likeCount,
         ${viewerCommentLikeExpression} AS viewerHasLiked
       FROM comments c
       INNER JOIN users u ON u.id = c.author_user_id
       WHERE c.story_id = ?1
         AND c.status = 'visible'
         AND (
           c.root_comment_id IS NULL
           OR EXISTS (
             SELECT 1 FROM comments root
             WHERE root.id = c.root_comment_id AND root.status = 'visible'
           )
         )
       ORDER BY c.created_at ASC`,
    );
    const commentRows = viewerUserId
      ? await commentsStatement.bind(storyId, viewerUserId).all<CommentRow>()
      : await commentsStatement.bind(storyId).all<CommentRow>();

    const comments = (commentRows.results ?? []).map((row) => ({
      id: row.id,
      storyId: row.storyId,
      author: {
        id: row.authorUserId,
        displayName: row.displayName,
      },
      rootCommentId: row.rootCommentId,
      replyToCommentId: row.replyToCommentId,
      body: row.body,
      likeCount: Number(row.likeCount ?? 0),
      viewerHasLiked: Boolean(row.viewerHasLiked),
      createdAt: new Date(Number(row.createdAt)).toISOString(),
    }));

    return {
      storyId,
      likeCount: Number(likeCountRow?.count ?? 0),
      viewerHasLiked: Boolean(viewerLikeRow?.liked),
      commentCount: comments.length,
      comments,
    };
  }

  return {
    async isStoryPublished(storyId) {
      const row = await database
        .prepare(
          `SELECT 1 AS ok
           FROM stories s
           INNER JOIN story_revisions r ON r.id = s.published_revision_id
           WHERE s.id = ?1
             AND s.status = 'active'
             AND r.status = 'published'
           LIMIT 1`,
        )
        .bind(storyId)
        .first<{ ok: number }>();
      return Boolean(row?.ok);
    },

    async getSocial(storyId, viewerUserId) {
      return getSocial(storyId, viewerUserId);
    },

    async getVisibleComment(commentId) {
      const row = await database
        .prepare(
          `SELECT
             id,
             story_id AS storyId,
             author_user_id AS authorUserId,
             root_comment_id AS rootCommentId
           FROM comments
           WHERE id = ?1 AND status = 'visible'
           LIMIT 1`,
        )
        .bind(commentId)
        .first<{
          id: string;
          storyId: string;
          authorUserId: string;
          rootCommentId: string | null;
        }>();
      return row ?? null;
    },

    async createComment(input: CreateSocialCommentRecord) {
      const id = createEntityId("comment");
      const timestamp = input.now.getTime();
      await database
        .prepare(
          `INSERT INTO comments (
             id,
             story_id,
             author_user_id,
             root_comment_id,
             reply_to_comment_id,
             body,
             status,
             created_at,
             updated_at
           ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'visible', ?7, ?7)`,
        )
        .bind(
          id,
          input.storyId,
          input.authorUserId,
          input.rootCommentId,
          input.replyToCommentId,
          input.body,
          timestamp,
        )
        .run();
    },

    async setCommentStatus(commentId, status, now) {
      await database
        .prepare("UPDATE comments SET status = ?1, updated_at = ?2 WHERE id = ?3")
        .bind(status, now.getTime(), commentId)
        .run();
    },

    async setStoryLike(storyId, userId, liked, now) {
      if (liked) {
        await database
          .prepare(
            `INSERT OR IGNORE INTO story_likes (user_id, story_id, created_at)
             VALUES (?1, ?2, ?3)`,
          )
          .bind(userId, storyId, now.getTime())
          .run();
        return;
      }
      await database
        .prepare("DELETE FROM story_likes WHERE user_id = ?1 AND story_id = ?2")
        .bind(userId, storyId)
        .run();
    },

    async setCommentLike(commentId, userId, liked, now) {
      if (liked) {
        await database
          .prepare(
            `INSERT OR IGNORE INTO comment_likes (user_id, comment_id, created_at)
             VALUES (?1, ?2, ?3)`,
          )
          .bind(userId, commentId, now.getTime())
          .run();
        return;
      }
      await database
        .prepare("DELETE FROM comment_likes WHERE user_id = ?1 AND comment_id = ?2")
        .bind(userId, commentId)
        .run();
    },
  };
}

export { createD1StorySocialRepository };
