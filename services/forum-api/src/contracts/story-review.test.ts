import assert from "node:assert/strict";
import test from "node:test";
import {
  storyReviewPatchSchema,
  type StoryReviewItem,
  type StoryReviewPatch,
  type StoryRevisionStatus,
} from "@ruoshui/shared";

import {
  StoryReviewServiceError,
  createStoryReviewService,
  type StoryReviewRepository,
} from "../lib/story-review.js";

const baseTime = "2026-09-06T00:00:00.000Z";

function createReviewItem(
  revisionId: string,
  status: StoryRevisionStatus = "pending_review",
): StoryReviewItem {
  return {
    story: {
      id: `story_${revisionId}`,
      authorUserId: "user_author",
      status: "active",
      publishedRevisionId: "revision_previous",
      createdAt: baseTime,
      updatedAt: baseTime,
    },
    revision: {
      id: revisionId,
      storyId: `story_${revisionId}`,
      status,
      createdByUserId: "user_author",
      title: "原来的标题",
      body: "这段正文由作者提交，审核员不应直接改写。",
      memoryTime: "2022 年秋",
      mediaAssetIds: ["media_1"],
      location: { kind: "place", placeId: "place_old" },
      moderationNote: null,
      createdAt: baseTime,
      updatedAt: baseTime,
    },
    author: {
      id: "user_author",
      displayName: "作者",
      createdAt: baseTime,
      updatedAt: baseTime,
    },
  };
}

function createHarness() {
  const items = new Map<string, StoryReviewItem>();
  let failNextApproval = false;

  const repository: StoryReviewRepository = {
    async getReviewItem(revisionId) {
      return items.get(revisionId) ?? null;
    },

    async listPendingReviews() {
      return [...items.values()].filter((item) => item.revision.status === "pending_review");
    },

    async patchPendingRevision(revisionId, input: StoryReviewPatch, now) {
      const item = items.get(revisionId);
      if (!item || item.revision.status !== "pending_review") return null;

      const revision = { ...item.revision, updatedAt: now.toISOString() };
      if (input.title !== undefined) {
        if (input.title === null) delete revision.title;
        else revision.title = input.title;
      }
      if (input.memoryTime !== undefined) {
        if (input.memoryTime === null) delete revision.memoryTime;
        else revision.memoryTime = input.memoryTime;
      }
      if (input.location !== undefined) revision.location = input.location;

      const updated = {
        ...item,
        story: { ...item.story, updatedAt: now.toISOString() },
        revision,
      };
      items.set(revisionId, updated);
      return updated;
    },

    async approveRevision(revisionId, now) {
      if (failNextApproval) {
        failNextApproval = false;
        return null;
      }
      const item = items.get(revisionId);
      if (!item || item.revision.status !== "pending_review") return null;
      const updated: StoryReviewItem = {
        ...item,
        story: {
          ...item.story,
          status: "active",
          publishedRevisionId: revisionId,
          updatedAt: now.toISOString(),
        },
        revision: {
          ...item.revision,
          status: "published",
          moderationNote: null,
          updatedAt: now.toISOString(),
        },
      };
      items.set(revisionId, updated);
      return updated;
    },

    async requestChanges(revisionId, note, now) {
      const item = items.get(revisionId);
      if (!item || item.revision.status !== "pending_review") return null;
      const updated: StoryReviewItem = {
        ...item,
        revision: {
          ...item.revision,
          status: "changes_requested",
          moderationNote: note,
          updatedAt: now.toISOString(),
        },
      };
      items.set(revisionId, updated);
      return updated;
    },

    async rejectRevision(revisionId, note, now) {
      const item = items.get(revisionId);
      if (!item || item.revision.status !== "pending_review") return null;
      const updated: StoryReviewItem = {
        ...item,
        revision: {
          ...item.revision,
          status: "rejected",
          moderationNote: note ?? null,
          updatedAt: now.toISOString(),
        },
      };
      items.set(revisionId, updated);
      return updated;
    },
  };

  return {
    items,
    failApprovalOnce() {
      failNextApproval = true;
    },
    service: createStoryReviewService({
      repository,
      now: () => new Date("2026-09-06T01:02:03.000Z"),
    }),
  };
}

test("review queue only returns pending revisions", async () => {
  const harness = createHarness();
  harness.items.set("revision_pending", createReviewItem("revision_pending"));
  harness.items.set("revision_published", createReviewItem("revision_published", "published"));

  const queue = await harness.service.listPendingReviews();
  assert.deepEqual(queue.map((item) => item.revision.id), ["revision_pending"]);
});

test("review correction is limited to metadata and location", async () => {
  const harness = createHarness();
  harness.items.set("revision_1", createReviewItem("revision_1"));

  const updated = await harness.service.patchRevision("revision_1", {
    title: "校准后的标题",
    memoryTime: "2022 年冬",
    location: { kind: "place", placeId: "place_new" },
  });

  assert.equal(updated.revision.title, "校准后的标题");
  assert.equal(updated.revision.memoryTime, "2022 年冬");
  assert.deepEqual(updated.revision.location, { kind: "place", placeId: "place_new" });
  assert.equal(updated.revision.body, "这段正文由作者提交，审核员不应直接改写。");
  assert.deepEqual(updated.revision.mediaAssetIds, ["media_1"]);

  assert.equal(
    storyReviewPatchSchema.safeParse({ body: "审核员直接重写正文" }).success,
    false,
  );
});

test("approving atomically promotes the reviewed revision as the public pointer", async () => {
  const harness = createHarness();
  harness.items.set("revision_1", createReviewItem("revision_1"));

  const approved = await harness.service.approveRevision("revision_1");
  assert.equal(approved.revision.status, "published");
  assert.equal(approved.story.publishedRevisionId, "revision_1");
  assert.equal(approved.story.status, "active");
});

test("requesting changes preserves the revision and records the reason", async () => {
  const harness = createHarness();
  harness.items.set("revision_1", createReviewItem("revision_1"));

  const returned = await harness.service.requestChanges("revision_1", "地点请重新标得更准确一些");
  assert.equal(returned.revision.status, "changes_requested");
  assert.equal(returned.revision.moderationNote, "地点请重新标得更准确一些");

  await assert.rejects(
    () => harness.service.approveRevision("revision_1"),
    (error) => error instanceof StoryReviewServiceError && error.status === 409,
  );
});

test("rejected revisions cannot be reviewed a second time", async () => {
  const harness = createHarness();
  harness.items.set("revision_1", createReviewItem("revision_1"));

  const rejected = await harness.service.rejectRevision("revision_1", "不适合公开展示");
  assert.equal(rejected.revision.status, "rejected");
  assert.equal(rejected.revision.moderationNote, "不适合公开展示");

  await assert.rejects(
    () => harness.service.patchRevision("revision_1", { title: "再次修改" }),
    (error) => error instanceof StoryReviewServiceError && error.status === 409,
  );
});

test("a race after the pending check surfaces as conflict instead of a false success", async () => {
  const harness = createHarness();
  harness.items.set("revision_1", createReviewItem("revision_1"));
  harness.failApprovalOnce();

  await assert.rejects(
    () => harness.service.approveRevision("revision_1"),
    (error) => error instanceof StoryReviewServiceError && error.status === 409,
  );
});
