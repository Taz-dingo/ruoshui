import type {
  ListPublishedStoriesInput,
  PublishedStory,
  StoryLocation,
} from "@ruoshui/shared";
import type { D1Database } from "@cloudflare/workers-types";
import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import type { StoryReadRepository } from "../../lib/story-read.js";
import {
  mediaAssetDerivatives,
  mediaAssets,
  stories,
  storyRevisionMedia,
  storyRevisions,
  users,
} from "./schema.js";

type StoryRevisionRow = typeof storyRevisions.$inferSelect;

function mapLocation(row: StoryRevisionRow): StoryLocation {
  if (row.locationKind === "place") {
    if (!row.placeId) {
      return { kind: "none" };
    }
    return { kind: "place", placeId: row.placeId };
  }

  if (row.locationKind === "anchor") {
    const values = [
      row.anchorMarkerX,
      row.anchorMarkerY,
      row.anchorMarkerZ,
      row.anchorCameraX,
      row.anchorCameraY,
      row.anchorCameraZ,
      row.anchorTargetX,
      row.anchorTargetY,
      row.anchorTargetZ,
    ];
    if (values.some((value) => value === null)) {
      return { kind: "none" };
    }
    return {
      kind: "anchor",
      anchor: {
        markerPosition: {
          x: row.anchorMarkerX as number,
          y: row.anchorMarkerY as number,
          z: row.anchorMarkerZ as number,
        },
        cameraPose: {
          position: {
            x: row.anchorCameraX as number,
            y: row.anchorCameraY as number,
            z: row.anchorCameraZ as number,
          },
          target: {
            x: row.anchorTargetX as number,
            y: row.anchorTargetY as number,
            z: row.anchorTargetZ as number,
          },
          ...(row.anchorFovDeg === null ? {} : { fovDeg: row.anchorFovDeg }),
        },
      },
    };
  }

  return { kind: "none" };
}

function createD1StoryReadRepository(database: D1Database): StoryReadRepository {
  const db = drizzle(database);

  async function loadMediaIds(revisionId: string): Promise<string[]> {
    const rows = await db
      .select({ mediaAssetId: storyRevisionMedia.mediaAssetId })
      .from(storyRevisionMedia)
      .innerJoin(mediaAssets, eq(mediaAssets.id, storyRevisionMedia.mediaAssetId))
      .where(
        and(
          eq(storyRevisionMedia.storyRevisionId, revisionId),
          eq(mediaAssets.status, "ready"),
        ),
      )
      .orderBy(asc(storyRevisionMedia.sortOrder))
      .all();
    return rows.map((row) => row.mediaAssetId);
  }

  async function hydrate(row: {
    storyId: string;
    authorId: string;
    displayName: string | null;
    revision: StoryRevisionRow;
  }): Promise<PublishedStory> {
    return {
      id: row.storyId,
      author: {
        id: row.authorId,
        displayName: row.displayName,
      },
      title: row.revision.title ?? undefined,
      body: row.revision.body ?? undefined,
      memoryTime: row.revision.memoryTime ?? undefined,
      mediaAssetIds: await loadMediaIds(row.revision.id),
      location: mapLocation(row.revision),
      publishedAt: row.revision.updatedAt.toISOString(),
    };
  }

  function publishedBaseQuery() {
    return db
      .select({
        storyId: stories.id,
        authorId: users.id,
        displayName: users.displayName,
        revision: storyRevisions,
      })
      .from(stories)
      .innerJoin(storyRevisions, eq(storyRevisions.id, stories.publishedRevisionId))
      .innerJoin(users, eq(users.id, stories.authorUserId));
  }

  function publishedMediaConditions(storyId: string, mediaAssetId: string) {
    return and(
      eq(stories.id, storyId),
      eq(stories.status, "active"),
      eq(storyRevisions.status, "published"),
      eq(storyRevisionMedia.mediaAssetId, mediaAssetId),
      eq(mediaAssets.status, "ready"),
    );
  }

  return {
    async getPublishedStory(storyId) {
      const [row] = await publishedBaseQuery()
        .where(
          and(
            eq(stories.id, storyId),
            eq(stories.status, "active"),
            eq(storyRevisions.status, "published"),
          ),
        )
        .limit(1)
        .all();
      return row ? hydrate(row) : null;
    },

    async getPublishedStoryMediaRef(storyId, mediaAssetId) {
      const [row] = await db
        .select({
          id: mediaAssets.id,
          mimeType: mediaAssets.mimeType,
          objectKey: mediaAssets.objectKey,
        })
        .from(stories)
        .innerJoin(storyRevisions, eq(storyRevisions.id, stories.publishedRevisionId))
        .innerJoin(
          storyRevisionMedia,
          eq(storyRevisionMedia.storyRevisionId, storyRevisions.id),
        )
        .innerJoin(mediaAssets, eq(mediaAssets.id, storyRevisionMedia.mediaAssetId))
        .where(publishedMediaConditions(storyId, mediaAssetId))
        .limit(1)
        .all();
      return row ?? null;
    },

    async getPublishedStoryMediaDerivativeRef(storyId, mediaAssetId, variant) {
      const [row] = await db
        .select({
          id: mediaAssets.id,
          mimeType: mediaAssetDerivatives.mimeType,
          objectKey: mediaAssetDerivatives.objectKey,
        })
        .from(stories)
        .innerJoin(storyRevisions, eq(storyRevisions.id, stories.publishedRevisionId))
        .innerJoin(
          storyRevisionMedia,
          eq(storyRevisionMedia.storyRevisionId, storyRevisions.id),
        )
        .innerJoin(mediaAssets, eq(mediaAssets.id, storyRevisionMedia.mediaAssetId))
        .innerJoin(
          mediaAssetDerivatives,
          eq(mediaAssetDerivatives.mediaAssetId, mediaAssets.id),
        )
        .where(
          and(
            publishedMediaConditions(storyId, mediaAssetId),
            eq(mediaAssetDerivatives.variant, variant),
          ),
        )
        .limit(1)
        .all();
      return row ?? null;
    },

    async listPublishedStories(input: ListPublishedStoriesInput) {
      const conditions = [
        eq(stories.status, "active"),
        eq(storyRevisions.status, "published"),
      ];
      if (input.placeId) {
        conditions.push(eq(storyRevisions.placeId, input.placeId));
      }

      const rows = await publishedBaseQuery()
        .where(and(...conditions))
        .orderBy(desc(storyRevisions.updatedAt))
        .limit(input.limit)
        .all();
      return Promise.all(rows.map(hydrate));
    },
  };
}

export { createD1StoryReadRepository };