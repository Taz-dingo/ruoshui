import type { CreatePlaceInput, Place, UpdatePlaceInput } from "@ruoshui/shared";
import type { D1Database } from "@cloudflare/workers-types";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { createEntityId } from "../../lib/id.js";
import type { PlaceRepository } from "../../lib/place.js";
import { places } from "./schema.js";

type PlaceRow = typeof places.$inferSelect;

type PlaceInsert = typeof places.$inferInsert;

function mapPlace(row: PlaceRow): Place {
  return {
    id: row.id,
    ...(row.sceneId ? { sceneId: row.sceneId } : {}),
    name: row.name,
    ...(row.intro ? { intro: row.intro } : {}),
    anchor: {
      markerPosition: {
        x: row.markerX,
        y: row.markerY,
        z: row.markerZ,
      },
      cameraPose: {
        position: {
          x: row.cameraX,
          y: row.cameraY,
          z: row.cameraZ,
        },
        target: {
          x: row.cameraTargetX,
          y: row.cameraTargetY,
          z: row.cameraTargetZ,
        },
        ...(row.cameraFovDeg === null ? {} : { fovDeg: row.cameraFovDeg }),
      },
    },
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function anchorColumns(input: CreatePlaceInput["anchor"] | UpdatePlaceInput["anchor"]) {
  if (!input) {
    return {};
  }

  return {
    markerX: input.markerPosition.x,
    markerY: input.markerPosition.y,
    markerZ: input.markerPosition.z,
    cameraX: input.cameraPose.position.x,
    cameraY: input.cameraPose.position.y,
    cameraZ: input.cameraPose.position.z,
    cameraTargetX: input.cameraPose.target.x,
    cameraTargetY: input.cameraPose.target.y,
    cameraTargetZ: input.cameraPose.target.z,
    cameraFovDeg: input.cameraPose.fovDeg ?? null,
  };
}

function createD1PlaceRepository(database: D1Database): PlaceRepository {
  const db = drizzle(database);

  return {
    async createPlace(input, now) {
      const id = createEntityId("place");
      await db
        .insert(places)
        .values({
          id,
          sceneId: input.sceneId ?? null,
          name: input.name,
          intro: input.intro ?? null,
          ...anchorColumns(input.anchor),
          sortOrder: input.sortOrder,
          createdAt: now,
          updatedAt: now,
        } as PlaceInsert)
        .run();

      const [row] = await db.select().from(places).where(eq(places.id, id)).limit(1).all();
      if (!row) {
        throw new Error("Failed to read newly created Place.");
      }
      return mapPlace(row);
    },

    async getPlace(placeId) {
      const [row] = await db.select().from(places).where(eq(places.id, placeId)).limit(1).all();
      return row ? mapPlace(row) : null;
    },

    async listPlaces(input) {
      const query = db
        .select()
        .from(places)
        .orderBy(asc(places.sortOrder), asc(places.name))
        .$dynamic();
      const rows = input.sceneId
        ? await query.where(eq(places.sceneId, input.sceneId)).all()
        : await query.all();
      return rows.map(mapPlace);
    },

    async updatePlace(placeId, input, now) {
      const set: Partial<PlaceInsert> = {
        updatedAt: now,
      };

      if (input.name !== undefined) set.name = input.name;
      if (input.intro !== undefined) set.intro = input.intro;
      if (input.sortOrder !== undefined) set.sortOrder = input.sortOrder;
      if (input.anchor !== undefined) Object.assign(set, anchorColumns(input.anchor));

      const result = await db.update(places).set(set).where(eq(places.id, placeId)).run();
      if (!result.meta.changes) {
        return null;
      }

      const [row] = await db.select().from(places).where(eq(places.id, placeId)).limit(1).all();
      return row ? mapPlace(row) : null;
    },
  };
}

export { createD1PlaceRepository };
