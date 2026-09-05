import assert from "node:assert/strict";
import test from "node:test";
import type {
  CreateStoryDraftInput,
  StoryDraft,
  StoryDraftPatch,
} from "@ruoshui/shared";

import {
  StoryServiceError,
  createStoryService,
  type StoryRepository,
} from "../lib/story.js";

function createDraftRecord(userId: string, storyId: string, input: CreateStoryDraftInput): StoryDraft {
  const now = "2026-09-06T00:00:00.000Z";
  return {
    story: {
      id: storyId,
      authorUserId: userId,
      status: "active",
      publishedRevisionId: null,
      createdAt: now,
      updatedAt: now,
    },
    revision: {
      id: `revision_${storyId}`,
      storyId,
      status: "draft",
      createdByUserId: userId,
      title: input.title,
      body: input.body,
      memoryTime: input.memoryTime,
      mediaAssetIds: input.mediaAssetIds ?? [],
      location: input.location ?? { kind: "none" },
      moderationNote: null,
      createdAt: now,
      updatedAt: now,
    },
  };
}

function createHarness() {
  const drafts = new Map<string, StoryDraft>();
  const readyMedia = new Set<string>();
  let sequence = 0;

  const repository: StoryRepository = {
    async createDraft(userId, input) {
      const storyId = `story_${++sequence}`;
      const draft = createDraftRecord(userId, storyId, input);
      drafts.set(storyId, draft);
      return draft;
    },
    async getDraft(userId, storyId) {
      const draft = drafts.get(storyId);
      return draft?.story.authorUserId === userId &&
        (draft.revision.status === "draft" || draft.revision.status === "changes_requested")
        ? draft
        : null;
    },
    async listDrafts(userId) {
      return [...drafts.values()].filter(
        (draft) =>
          draft.story.authorUserId === userId &&
          (draft.revision.status === "draft" || draft.revision.status === "changes_requested"),
      );
    },
    async updateDraft(userId, storyId, input: StoryDraftPatch, now) {
      const current = await this.getDraft(userId, storyId);
      if (!current) return null;
      const revision = {
        ...current.revision,
        ...(input.title === undefined ? {} : { title: input.title || undefined }),
        ...(input.body === undefined ? {} : { body: input.body || undefined }),
        ...(input.memoryTime === undefined
          ? {}
          : { memoryTime: input.memoryTime || undefined }),
        ...(input.mediaAssetIds === undefined ? {} : { mediaAssetIds: input.mediaAssetIds }),
        ...(input.location === undefined ? {} : { location: input.location }),
        status: "draft" as const,
        moderationNote: null,
        updatedAt: now.toISOString(),
      };
      const updated = {
        story: { ...current.story, updatedAt: now.toISOString() },
        revision,
      };
      drafts.set(storyId, updated);
      return updated;
    },
    async markDraftPendingReview(userId, storyId, revisionId, now) {
      const current = await this.getDraft(userId, storyId);
      if (!current || current.revision.id !== revisionId) return null;
      const updated: StoryDraft = {
        story: { ...current.story, updatedAt: now.toISOString() },
        revision: {
          ...current.revision,
          status: "pending_review",
          updatedAt: now.toISOString(),
        },
      };
      drafts.set(storyId, updated);
      return updated;
    },
    async areMediaAssetsReady(ids) {
      return ids.every((id) => readyMedia.has(id));
    },
  };

  return {
    drafts,
    readyMedia,
    service: createStoryService({ repository }),
  };
}

test("a Story draft can be saved while incomplete", async () => {
  const harness = createHarness();
  const draft = await harness.service.createDraft("user_1", { title: "若水广场" });
  assert.equal(draft.revision.title, "若水广场");
  assert.equal(draft.revision.mediaAssetIds.length, 0);
});

test("a Story draft cannot be submitted without text or photos", async () => {
  const harness = createHarness();
  const draft = await harness.service.createDraft("user_1", { title: "只有标题" });

  await assert.rejects(() => harness.service.submitDraft("user_1", draft.story.id));
});

test("photo Story waits until every referenced media asset is ready", async () => {
  const harness = createHarness();
  const draft = await harness.service.createDraft("user_1", {
    mediaAssetIds: ["media_1"],
  });

  await assert.rejects(
    () => harness.service.submitDraft("user_1", draft.story.id),
    (error) => error instanceof StoryServiceError && error.status === 409,
  );

  harness.readyMedia.add("media_1");
  const submitted = await harness.service.submitDraft("user_1", draft.story.id);
  assert.equal(submitted.revision.status, "pending_review");
});

test("users cannot read or edit another user's draft", async () => {
  const harness = createHarness();
  const draft = await harness.service.createDraft("user_1", { body: "我的故事" });

  await assert.rejects(
    () => harness.service.getDraft("user_2", draft.story.id),
    (error) => error instanceof StoryServiceError && error.status === 404,
  );
  await assert.rejects(
    () => harness.service.updateDraft("user_2", draft.story.id, { body: "篡改" }),
    (error) => error instanceof StoryServiceError && error.status === 404,
  );
});

test("changes requested revisions become draft again when edited", async () => {
  const harness = createHarness();
  const draft = await harness.service.createDraft("user_1", { body: "第一版" });
  const stored = harness.drafts.get(draft.story.id);
  assert.ok(stored);
  stored.revision.status = "changes_requested";

  const updated = await harness.service.updateDraft("user_1", draft.story.id, {
    body: "修改后的版本",
  });
  assert.equal(updated.revision.status, "draft");
  assert.equal(updated.revision.body, "修改后的版本");
});
