import assert from "node:assert/strict";
import test from "node:test";
import type { StorySocial } from "@ruoshui/shared";

import {
  StorySocialServiceError,
  createStorySocialService,
  type CreateSocialCommentRecord,
  type StorySocialRepository,
} from "../lib/story-social.js";

function createHarness() {
  const publishedStories = new Set(["story_1", "story_2"]);
  const commentRefs = new Map([
    ["comment_root", { id: "comment_root", storyId: "story_1", rootCommentId: null }],
    ["comment_reply", { id: "comment_reply", storyId: "story_1", rootCommentId: "comment_root" }],
    ["comment_other", { id: "comment_other", storyId: "story_2", rootCommentId: null }],
  ]);
  const createdComments: CreateSocialCommentRecord[] = [];
  const storyLikes = new Map<string, boolean>();
  const commentLikes = new Map<string, boolean>();

  const snapshot: StorySocial = {
    storyId: "story_1",
    likeCount: 0,
    viewerHasLiked: false,
    commentCount: 0,
    comments: [],
  };

  const repository: StorySocialRepository = {
    async isStoryPublished(storyId) {
      return publishedStories.has(storyId);
    },
    async getSocial(storyId, viewerUserId) {
      return {
        ...snapshot,
        storyId,
        viewerHasLiked: viewerUserId ? Boolean(storyLikes.get(`${viewerUserId}:${storyId}`)) : false,
      };
    },
    async getVisibleComment(commentId) {
      return commentRefs.get(commentId) ?? null;
    },
    async createComment(input) {
      createdComments.push(input);
    },
    async setStoryLike(storyId, userId, liked) {
      storyLikes.set(`${userId}:${storyId}`, liked);
    },
    async setCommentLike(commentId, userId, liked) {
      commentLikes.set(`${userId}:${commentId}`, liked);
    },
  };

  return {
    commentLikes,
    createdComments,
    service: createStorySocialService({
      repository,
      now: () => new Date("2026-09-06T06:00:00.000Z"),
    }),
    storyLikes,
  };
}

test("anonymous users can read social state for a published Story", async () => {
  const harness = createHarness();
  const social = await harness.service.getSocial("story_1");
  assert.equal(social.storyId, "story_1");
  assert.equal(social.viewerHasLiked, false);
});

test("unpublished Stories cannot be liked or commented on", async () => {
  const harness = createHarness();
  await assert.rejects(
    () => harness.service.setStoryLike("story_private", "user_1", true),
    (error) => error instanceof StorySocialServiceError && error.status === 404,
  );
  await assert.rejects(
    () => harness.service.createComment("story_private", "user_1", { body: "hello" }),
    (error) => error instanceof StorySocialServiceError && error.status === 404,
  );
});

test("replying to a top-level comment creates one visual reply level", async () => {
  const harness = createHarness();
  await harness.service.createComment("story_1", "user_1", {
    body: "回复主评论",
    replyToCommentId: "comment_root",
  });

  assert.equal(harness.createdComments.length, 1);
  assert.equal(harness.createdComments[0]?.rootCommentId, "comment_root");
  assert.equal(harness.createdComments[0]?.replyToCommentId, "comment_root");
});

test("replying to an existing reply keeps the same root while preserving exact target", async () => {
  const harness = createHarness();
  await harness.service.createComment("story_1", "user_1", {
    body: "回复回复",
    replyToCommentId: "comment_reply",
  });

  assert.equal(harness.createdComments[0]?.rootCommentId, "comment_root");
  assert.equal(harness.createdComments[0]?.replyToCommentId, "comment_reply");
});

test("a reply cannot point at a comment from another Story", async () => {
  const harness = createHarness();
  await assert.rejects(
    () =>
      harness.service.createComment("story_1", "user_1", {
        body: "跨 Story 回复",
        replyToCommentId: "comment_other",
      }),
    (error) => error instanceof StorySocialServiceError && error.status === 400,
  );
  assert.equal(harness.createdComments.length, 0);
});

test("like writes are explicit idempotent states instead of toggle commands", async () => {
  const harness = createHarness();
  await harness.service.setStoryLike("story_1", "user_1", true);
  assert.equal(harness.storyLikes.get("user_1:story_1"), true);
  await harness.service.setStoryLike("story_1", "user_1", true);
  assert.equal(harness.storyLikes.get("user_1:story_1"), true);
  await harness.service.setStoryLike("story_1", "user_1", false);
  assert.equal(harness.storyLikes.get("user_1:story_1"), false);

  await harness.service.setCommentLike("comment_root", "user_1", true);
  assert.equal(harness.commentLikes.get("user_1:comment_root"), true);
});
