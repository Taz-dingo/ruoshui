import assert from "node:assert/strict";
import test from "node:test";
import type { StoryReviewItem, User } from "@ruoshui/shared";

import type { AuthService } from "../lib/auth.js";
import type { StoryReviewService } from "../lib/story-review.js";
import { createStoryReviewRoute } from "../routes/story-review-route.js";

const now = "2026-09-06T00:00:00.000Z";

function createUser(id: string): User {
  return {
    id,
    displayName: id,
    createdAt: now,
    updatedAt: now,
  };
}

function createReviewItem(): StoryReviewItem {
  return {
    story: {
      id: "story_1",
      authorUserId: "user_author",
      status: "active",
      publishedRevisionId: null,
      createdAt: now,
      updatedAt: now,
    },
    revision: {
      id: "revision_1",
      storyId: "story_1",
      status: "pending_review",
      createdByUserId: "user_author",
      body: "故事",
      mediaAssetIds: [],
      location: { kind: "none" },
      moderationNote: null,
      createdAt: now,
      updatedAt: now,
    },
    author: createUser("user_author"),
  };
}

function createHarness(sessionUser: User | null) {
  const item = createReviewItem();
  const authService = {
    async getUserForSessionToken() {
      return sessionUser;
    },
  } as Pick<AuthService, "getUserForSessionToken"> as AuthService;
  const reviewService = {
    async listPendingReviews() {
      return [item];
    },
    async getReviewItem() {
      return item;
    },
    async patchRevision() {
      return item;
    },
    async approveRevision() {
      return { ...item, revision: { ...item.revision, status: "published" as const } };
    },
    async requestChanges() {
      return { ...item, revision: { ...item.revision, status: "changes_requested" as const } };
    },
    async rejectRevision() {
      return { ...item, revision: { ...item.revision, status: "rejected" as const } };
    },
  } satisfies StoryReviewService;

  return createStoryReviewRoute({
    adminUserIds: new Set(["user_admin"]),
    authService,
    reviewService,
  });
}

test("review queue requires authentication", async () => {
  const route = createHarness(null);
  const response = await route.request("/", {
    headers: { cookie: "ruoshui_session=token" },
  });
  assert.equal(response.status, 401);
});

test("review queue rejects signed-in non-admin users", async () => {
  const route = createHarness(createUser("user_regular"));
  const response = await route.request("/", {
    headers: { cookie: "ruoshui_session=token" },
  });
  assert.equal(response.status, 403);
});

test("review queue is readable by an allowed admin", async () => {
  const route = createHarness(createUser("user_admin"));
  const response = await route.request("/", {
    headers: { cookie: "ruoshui_session=token" },
  });
  assert.equal(response.status, 200);
  const payload = (await response.json()) as { ok: boolean; data: StoryReviewItem[] };
  assert.equal(payload.ok, true);
  assert.equal(payload.data[0]?.revision.id, "revision_1");
});
