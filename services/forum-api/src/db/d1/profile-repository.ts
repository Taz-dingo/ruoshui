import type { AlumniIdentity } from "@ruoshui/shared";
import type { D1Database } from "@cloudflare/workers-types";

import type {
  StoredUserProfile,
  UserProfileRepository,
} from "../../lib/profile.js";

interface ProfileRow {
  avatarObjectKey: string | null;
  enrollmentYear: number | null;
  graduationYear: number | null;
  department: string | null;
  major: string | null;
}

function emptyProfile(): StoredUserProfile {
  return {
    avatarObjectKey: null,
    alumniIdentity: null,
  };
}

function mapProfile(row: ProfileRow | null): StoredUserProfile {
  if (!row) return emptyProfile();
  const hasAlumniIdentity =
    row.enrollmentYear !== null ||
    row.graduationYear !== null ||
    row.department !== null ||
    row.major !== null;

  return {
    avatarObjectKey: row.avatarObjectKey,
    alumniIdentity: hasAlumniIdentity
      ? {
          enrollmentYear: row.enrollmentYear,
          graduationYear: row.graduationYear,
          department: row.department,
          major: row.major,
        }
      : null,
  };
}

function createD1UserProfileRepository(database: D1Database): UserProfileRepository {
  async function getProfile(userId: string): Promise<StoredUserProfile> {
    const row = await database
      .prepare(
        `SELECT
           avatar_object_key AS avatarObjectKey,
           alumni_enrollment_year AS enrollmentYear,
           alumni_graduation_year AS graduationYear,
           alumni_department AS department,
           alumni_major AS major
         FROM user_profiles
         WHERE user_id = ?1
         LIMIT 1`,
      )
      .bind(userId)
      .first<ProfileRow>();
    return mapProfile(row ?? null);
  }

  return {
    getProfile,

    async setAlumniIdentity(userId: string, identity: AlumniIdentity | null, now: Date) {
      await database
        .prepare(
          `INSERT INTO user_profiles (
             user_id,
             avatar_object_key,
             alumni_enrollment_year,
             alumni_graduation_year,
             alumni_department,
             alumni_major,
             updated_at
           ) VALUES (?1, NULL, ?2, ?3, ?4, ?5, ?6)
           ON CONFLICT(user_id) DO UPDATE SET
             alumni_enrollment_year = excluded.alumni_enrollment_year,
             alumni_graduation_year = excluded.alumni_graduation_year,
             alumni_department = excluded.alumni_department,
             alumni_major = excluded.alumni_major,
             updated_at = excluded.updated_at`,
        )
        .bind(
          userId,
          identity?.enrollmentYear ?? null,
          identity?.graduationYear ?? null,
          identity?.department ?? null,
          identity?.major ?? null,
          now.getTime(),
        )
        .run();
    },

    async setAvatarObjectKey(userId: string, objectKey: string | null, now: Date) {
      await database
        .prepare(
          `INSERT INTO user_profiles (
             user_id,
             avatar_object_key,
             alumni_enrollment_year,
             alumni_graduation_year,
             alumni_department,
             alumni_major,
             updated_at
           ) VALUES (?1, ?2, NULL, NULL, NULL, NULL, ?3)
           ON CONFLICT(user_id) DO UPDATE SET
             avatar_object_key = excluded.avatar_object_key,
             updated_at = excluded.updated_at`,
        )
        .bind(userId, objectKey, now.getTime())
        .run();
    },
  };
}

export { createD1UserProfileRepository };
