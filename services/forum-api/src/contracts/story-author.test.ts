import assert from "node:assert/strict";
import test from "node:test";
import type { Story, StoryDraft } from "@ruoshui/shared";

import {
  StoryAuthorServiceError,
  createStoryAuthorService,
  type StoryAuthorRepository,
} from "../lib/story-author.js";

const baseStory: Story = {
  id: "story_1",
  authorUserId: "user_1",
  status: "active",
  publishedRevisionId: "revision_published",
  createdAt: "2026-09-06T00:00:00.000Z",
  updatedAt: "2026-09-06T00:00:00.000Z",
};

const editDraft: StoryDraft = {
  story: baseStory,
  revision: {
    id: "revision_edit",
    storyId: "story_1",
    status: "draft",
    createdByUserId: "user_1",
    title: "旧版标题",
    body: "旧版正文",
    mediaAssetIds: ["media_1"],
    location: { kind: "place", placeId: "place_1" },
    moderationNote: null,
    createdAt: "2026-09-06T01:00:00.000Z",
    updatedAt: "2026-09-06T01:00:00.000Z",
  },
};

function createHarness(result: StoryDraft | "conflict" | null = editDraft) {
  let lastAction: string | null = null;
  const repository: StoryAuthorRepository = {
    async createDraftFromPublished() {
      lastAction = "edit";
      return result;
    },
    async unpublishStory() {
      lastAction = "unpublish";
      return { ...baseStory, status: "unpublished" };
    },
    async softDeleteStory() {
      lastAction = "delete";
      return { ...baseStory, status: "deleted" };
    },
  };

  return {
    getLastAction: () => lastAction,
    service: createStoryAuthorService({
      repository,
      now: () => new Date("2026-09-06T01:00:00.000Z"),
    }),
  };
}

test("editing a published Story creates a draft without moving the public pointer", async () => {
  const harness = createHarness();
  const draft = await harness.service.createEditDraft("user_1", "story_1");

  assert.equal(draft.revision.status, "draft");
  assert.equal(draft.story.publishedRevisionId, "revision_published");
  assert.equal(draft.revision.id, "revision_edit");
  assert.notEqual(draft.revision.id, draft.story.publishedRevisionId);
});

test("a Story cannot open a second edit revision while work is already in progress", async () => {
  const harness = createHarness("conflict");
  await assert.rejects(
    () => harness.service.createEditDraft("user_1", "story_1"),
    (error) => error instanceof StoryAuthorServiceError && error.status === 409,
  );
});

test("unpublish keeps the Story record and published pointer for later revision work", async () => {
  const harness = createHarness();
  const story = await harness.service.unpublishStory("user_1", "story_1");

  assert.equal(harness.getLastAction(), "unpublish");
  assert.equal(story.status, "unpublished");
  assert.equal(story.publishedRevisionId, "revision_published");
});

test("delete is a soft state transition instead of destructive data removal", async () => {
  const harness = createHarness();
  const story = await harness.service.deleteStory("user_1", "story_1");

  assert.equal(harness.getLastAction(), "delete");
  assert.equal(story.status, "deleted");
  assert.equal(story.publishedRevisionId, "revision_published");
});

test("non-owned or unavailable Stories surface as not found", async () => {
  const harness = createHarness(null);
  await assert.rejects(
    () => harness.service.createEditDraft("user_2", "story_1"),
    (error) => error instanceof StoryAuthorServiceError && error.status === 404,
  );
});
