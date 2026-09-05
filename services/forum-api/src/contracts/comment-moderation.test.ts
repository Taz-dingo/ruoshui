import assert from "node:assert/strict";
import test from "node:test";

import {
  CommentModerationServiceError,
  createCommentModerationService,
  type CommentModerationItem,
  type CommentModerationRepository,
} from "../lib/comment-moderation.js";

function createItem(status: "visible" | "hidden" | "deleted" = "visible"): CommentModerationItem {
  return {
    id: "comment_1",
    storyId: "story_1",
    storyTitle: "操场边的一晚",
    author: { id: "user_1", displayName: "Alice" },
    rootCommentId: null,
    replyToCommentId: null,
    body: "这里我也记得。",
    status,
    createdAt: "2026-09-06T06:00:00.000Z",
    updatedAt: "2026-09-06T06:00:00.000Z",
  };
}

function createHarness(initialStatus: "visible" | "hidden" | "deleted" = "visible") {
  let item = createItem(initialStatus);
  const repository: CommentModerationRepository = {
    async listComments() {
      return item.status === "deleted" ? [] : [item];
    },
    async setCommentStatus(commentId, status, now) {
      if (commentId !== item.id || item.status === "deleted") return null;
      item = { ...item, status, updatedAt: now.toISOString() };
      return item;
    },
  };

  return {
    get item() {
      return item;
    },
    service: createCommentModerationService({
      repository,
      now: () => new Date("2026-09-06T07:00:00.000Z"),
    }),
  };
}

test("admins can hide and restore a comment without deleting it", async () => {
  const harness = createHarness();
  const hidden = await harness.service.hideComment("comment_1");
  assert.equal(hidden.status, "hidden");
  const restored = await harness.service.restoreComment("comment_1");
  assert.equal(restored.status, "visible");
});

test("author-deleted comments cannot be restored by moderation", async () => {
  const harness = createHarness("deleted");
  await assert.rejects(
    () => harness.service.restoreComment("comment_1"),
    (error) => error instanceof CommentModerationServiceError && error.status === 404,
  );
});

test("moderation list limit is clamped", async () => {
  let receivedLimit = 0;
  const repository: CommentModerationRepository = {
    async listComments(limit) {
      receivedLimit = limit;
      return [];
    },
    async setCommentStatus() {
      return null;
    },
  };
  const service = createCommentModerationService({ repository });
  await service.listComments(9999);
  assert.equal(receivedLimit, 200);
});
