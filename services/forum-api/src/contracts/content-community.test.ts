import assert from "node:assert/strict";
import test from "node:test";
import { submitStoryRevisionInputSchema } from "@ruoshui/shared";

const baseLocation = { kind: "none" as const };

test("published story content requires body or media", () => {
  const result = submitStoryRevisionInputSchema.safeParse({
    mediaAssetIds: [],
    location: baseLocation,
  });

  assert.equal(result.success, false);
});

test("story content accepts body-only submissions", () => {
  const result = submitStoryRevisionInputSchema.safeParse({
    body: "这里发生过一段值得留下来的记忆。",
    mediaAssetIds: [],
    location: baseLocation,
  });

  assert.equal(result.success, true);
});

test("story content accepts photo-only submissions", () => {
  const result = submitStoryRevisionInputSchema.safeParse({
    mediaAssetIds: ["media_1"],
    location: baseLocation,
  });

  assert.equal(result.success, true);
});

test("story content rejects more than twelve photos", () => {
  const result = submitStoryRevisionInputSchema.safeParse({
    mediaAssetIds: Array.from({ length: 13 }, (_, index) => `media_${index}`),
    location: baseLocation,
  });

  assert.equal(result.success, false);
});

test("story location is exactly one of none, place or custom anchor", () => {
  const placeResult = submitStoryRevisionInputSchema.safeParse({
    body: "place",
    mediaAssetIds: [],
    location: { kind: "place", placeId: "place_1" },
  });
  const anchorResult = submitStoryRevisionInputSchema.safeParse({
    body: "anchor",
    mediaAssetIds: [],
    location: {
      kind: "anchor",
      anchor: {
        markerPosition: { x: 1, y: 0, z: 2 },
        cameraPose: {
          position: { x: 1.5, y: 0.8, z: 2.5 },
          target: { x: 1, y: 0, z: 2 },
          fovDeg: 55,
        },
      },
    },
  });
  const invalidResult = submitStoryRevisionInputSchema.safeParse({
    body: "invalid",
    mediaAssetIds: [],
    location: {
      kind: "place",
      placeId: "place_1",
      anchor: {
        markerPosition: { x: 1, y: 0, z: 2 },
        cameraPose: {
          position: { x: 1.5, y: 0.8, z: 2.5 },
          target: { x: 1, y: 0, z: 2 },
        },
      },
    },
  });

  assert.equal(placeResult.success, true);
  assert.equal(anchorResult.success, true);
  assert.equal(invalidResult.success, false);
});
