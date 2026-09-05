import assert from "node:assert/strict";
import test from "node:test";
import type { User } from "@ruoshui/shared";

import type { AuthService } from "../lib/auth.js";
import type { StorageProvider } from "../lib/storage.js";
import type { StoryOwnerReadService } from "../lib/story-owner-read.js";
import type { StoryService } from "../lib/story.js";
import { createStoryRoute } from "../routes/story-route.js";

const now = "2026-09-06T00:00:00.000Z";

function createUser(id: string): User {
  return {
    id,
    displayName: id,
    createdAt: now,
    updatedAt: now,
  };
}

function createHarness(sessionUser: User | null) {
  const authService = {
    async getUserForSessionToken() {
      return sessionUser;
    },
  } as Pick<AuthService, "getUserForSessionToken"> as AuthService;

  const storyOwnerReadService = {
    async getOwnedStoryMediaRef(userId: string, storyId: string, mediaAssetId: string) {
      if (userId !== "user_owner" || storyId !== "story_1" || mediaAssetId !== "media_1") {
        return null;
      }
      return {
        id: mediaAssetId,
        mimeType: "image/jpeg",
        objectKey: "story-drafts/user_owner/media_1.jpg",
      };
    },
    async listOwnedStories() {
      return [];
    },
  } satisfies StoryOwnerReadService;

  const storageProvider = {
    name: "none" as const,
    async createUploadTicket() {
      throw new Error("not used in owned media route tests");
    },
    async readObject(objectKey: string) {
      assert.equal(objectKey, "story-drafts/user_owner/media_1.jpg");
      return {
        body: "image-bytes",
        contentLength: 11,
        contentType: "image/jpeg",
      };
    },
  } satisfies StorageProvider;

  return createStoryRoute({
    authService,
    storageProvider,
    storyOwnerReadService,
    storyService: {} as StoryService,
  });
}

test("owned Story media requires authentication", async () => {
  const route = createHarness(null);
  const response = await route.request("/story_1/media/media_1", {
    headers: { cookie: "ruoshui_session=token" },
  });
  assert.equal(response.status, 401);
});

test("owned Story media does not expose another user's asset", async () => {
  const route = createHarness(createUser("user_other"));
  const response = await route.request("/story_1/media/media_1", {
    headers: { cookie: "ruoshui_session=token" },
  });
  assert.equal(response.status, 404);
});

test("Story owner can read media with private browser caching", async () => {
  const route = createHarness(createUser("user_owner"));
  const response = await route.request("/story_1/media/media_1", {
    headers: { cookie: "ruoshui_session=token" },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/jpeg");
  assert.equal(response.headers.get("cache-control"), "private, max-age=300");
  assert.equal(response.headers.get("vary"), "Cookie");
  assert.equal(await response.text(), "image-bytes");
});
