import assert from "node:assert/strict";
import test from "node:test";
import type {
  ListPublishedStoriesInput,
  PublishedStory,
} from "@ruoshui/shared";

import {
  StoryReadServiceError,
  createStoryReadService,
  type StoryReadRepository,
} from "../lib/story-read.js";

const publishedStory: PublishedStory = {
  id: "story_1",
  author: { id: "user_1", displayName: "小河" },
  title: "操场边的夏天",
  body: "一段已经审核通过的校园记忆。",
  memoryTime: "2022 年夏",
  mediaAssetIds: ["media_1"],
  location: { kind: "place", placeId: "place_track" },
  publishedAt: "2026-09-06T03:00:00.000Z",
};

function createHarness() {
  let lastListInput: ListPublishedStoriesInput | null = null;
  const repository: StoryReadRepository = {
    async getPublishedStory(storyId) {
      return storyId === publishedStory.id ? publishedStory : null;
    },
    async getPublishedStoryMediaRef(storyId, mediaAssetId) {
      if (storyId !== publishedStory.id || !publishedStory.mediaAssetIds.includes(mediaAssetId)) {
        return null;
      }
      return {
        id: mediaAssetId,
        mimeType: "image/jpeg",
        objectKey: "story-drafts/user_1/media_1.jpg",
      };
    },
    async getPublishedStoryMediaDerivativeRef(storyId, mediaAssetId, variant) {
      if (
        storyId !== publishedStory.id ||
        mediaAssetId !== "media_1" ||
        variant !== "thumbnail"
      ) {
        return null;
      }
      return {
        id: mediaAssetId,
        mimeType: "image/webp",
        objectKey: "story-drafts/user_1/media_1.thumbnail.webp",
      };
    },
    async listPublishedStories(input) {
      lastListInput = input;
      if (input.placeId && input.placeId !== "place_track") return [];
      return [publishedStory];
    },
  };
  return {
    getLastListInput: () => lastListInput,
    service: createStoryReadService(repository),
  };
}

test("published Story list preserves place and limit filters", async () => {
  const harness = createHarness();
  const result = await harness.service.listPublishedStories({
    placeId: "place_track",
    limit: 12,
  });
  assert.equal(result[0]?.id, "story_1");
  assert.deepEqual(harness.getLastListInput(), { placeId: "place_track", limit: 12 });
});

test("unpublished or unknown Story ids are not readable", async () => {
  const harness = createHarness();
  await assert.rejects(
    () => harness.service.getPublishedStory("story_private"),
    (error) => error instanceof StoryReadServiceError && error.status === 404,
  );
});

test("media must belong to the current published Story read model", async () => {
  const harness = createHarness();
  const media = await harness.service.getPublishedStoryMediaRef("story_1", "media_1");
  assert.equal(media.objectKey, "story-drafts/user_1/media_1.jpg");

  await assert.rejects(
    () => harness.service.getPublishedStoryMediaRef("story_1", "media_foreign"),
    (error) => error instanceof StoryReadServiceError && error.status === 404,
  );
});

test("thumbnail derivatives inherit published Story visibility", async () => {
  const harness = createHarness();
  const thumbnail = await harness.service.getPublishedStoryMediaDerivativeRef(
    "story_1",
    "media_1",
    "thumbnail",
  );
  assert.equal(thumbnail.mimeType, "image/webp");
  assert.match(thumbnail.objectKey, /thumbnail/);

  await assert.rejects(
    () =>
      harness.service.getPublishedStoryMediaDerivativeRef(
        "story_1",
        "media_foreign",
        "thumbnail",
      ),
    (error) => error instanceof StoryReadServiceError && error.status === 404,
  );
});