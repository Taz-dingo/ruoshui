import type { User } from "@ruoshui/shared";
import type { D1Database } from "@cloudflare/workers-types";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import type {
  AuthOtpChallengeRecord,
  AuthOtpPurpose,
  AuthRepository,
  AuthSessionRecord,
} from "../../lib/auth.js";
import { createEntityId } from "../../lib/id.js";
import {
  authIdentities,
  authOtpChallenges,
  sessions,
  users,
} from "./schema.js";

type UserRow = typeof users.$inferSelect;
type AuthOtpChallengeRow = typeof authOtpChallenges.$inferSelect;

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    displayName: row.displayName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapOtpChallenge(row: AuthOtpChallengeRow): AuthOtpChallengeRecord {
  return {
    id: row.id,
    subject: row.subject,
    purpose: row.purpose as AuthOtpPurpose,
    codeHash: row.codeHash,
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt,
    attemptCount: row.attemptCount,
    createdAt: row.createdAt,
  };
}

function createD1AuthRepository(database: D1Database): AuthRepository {
  const db = drizzle(database);

  async function getUserById(userId: string): Promise<User | null> {
    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1).all();
    return rows[0] ? mapUser(rows[0]) : null;
  }

  async function getUserByEmail(email: string): Promise<User | null> {
    const rows = await db
      .select({ user: users })
      .from(authIdentities)
      .innerJoin(users, eq(authIdentities.userId, users.id))
      .where(and(eq(authIdentities.provider, "email"), eq(authIdentities.subject, email)))
      .limit(1)
      .all();

    return rows[0] ? mapUser(rows[0].user) : null;
  }

  async function getEmailForUserId(userId: string): Promise<string | null> {
    const rows = await db
      .select({ subject: authIdentities.subject })
      .from(authIdentities)
      .where(and(eq(authIdentities.userId, userId), eq(authIdentities.provider, "email")))
      .orderBy(authIdentities.createdAt)
      .limit(1)
      .all();
    return rows[0]?.subject ?? null;
  }

  return {
    async createOtpChallenge(record: AuthOtpChallengeRecord): Promise<void> {
      await db
        .insert(authOtpChallenges)
        .values({
          id: record.id,
          subject: record.subject,
          purpose: record.purpose,
          codeHash: record.codeHash,
          expiresAt: record.expiresAt,
          consumedAt: record.consumedAt,
          attemptCount: record.attemptCount,
          createdAt: record.createdAt,
        })
        .run();
    },

    async getLatestOtpChallenge(
      subject: string,
      purpose: AuthOtpPurpose,
    ): Promise<AuthOtpChallengeRecord | null> {
      const rows = await db
        .select()
        .from(authOtpChallenges)
        .where(
          and(
            eq(authOtpChallenges.subject, subject),
            eq(authOtpChallenges.purpose, purpose),
          ),
        )
        .orderBy(desc(authOtpChallenges.createdAt))
        .limit(1)
        .all();

      return rows[0] ? mapOtpChallenge(rows[0]) : null;
    },

    async incrementOtpAttempt(id: string): Promise<void> {
      await db
        .update(authOtpChallenges)
        .set({
          attemptCount: sql`${authOtpChallenges.attemptCount} + 1`,
        })
        .where(eq(authOtpChallenges.id, id))
        .run();
    },

    async consumeOtpChallenge(id: string, consumedAt: Date): Promise<void> {
      await db
        .update(authOtpChallenges)
        .set({ consumedAt })
        .where(and(eq(authOtpChallenges.id, id), isNull(authOtpChallenges.consumedAt)))
        .run();
    },

    async getOrCreateUserByEmail(email: string, now: Date): Promise<User> {
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return existingUser;
      }

      const userId = createEntityId("user");
      const identityId = createEntityId("identity");

      try {
        await database.batch([
          database
            .prepare(
              "INSERT INTO users (id, display_name, created_at, updated_at) VALUES (?1, NULL, ?2, ?2)",
            )
            .bind(userId, now.getTime()),
          database
            .prepare(
              "INSERT INTO auth_identities (id, user_id, provider, subject, verified_at, created_at) VALUES (?1, ?2, 'email', ?3, ?4, ?4)",
            )
            .bind(identityId, userId, email, now.getTime()),
        ]);
      } catch (error) {
        const racedUser = await getUserByEmail(email);
        if (racedUser) {
          return racedUser;
        }
        throw error;
      }

      const createdUser = await getUserById(userId);
      if (!createdUser) {
        throw new Error("Failed to read newly created user.");
      }

      return createdUser;
    },

    async createSession(record: AuthSessionRecord): Promise<void> {
      await db
        .insert(sessions)
        .values({
          id: record.id,
          userId: record.userId,
          tokenHash: record.tokenHash,
          expiresAt: record.expiresAt,
          revokedAt: record.revokedAt,
          createdAt: record.createdAt,
        })
        .run();
    },

    async getEmailForUser(userId: string): Promise<string | null> {
      return getEmailForUserId(userId);
    },

    async getUserIdByEmail(email: string): Promise<string | null> {
      const user = await getUserByEmail(email);
      return user?.id ?? null;
    },

    async changeEmailForUser(
      userId,
      currentEmail,
      newEmail,
      currentSessionTokenHash,
      now,
    ) {
      const storedCurrentEmail = await getEmailForUserId(userId);
      if (storedCurrentEmail !== currentEmail) {
        return { status: "stale_current" };
      }

      const existingUser = await getUserByEmail(newEmail);
      if (existingUser) {
        return { status: "email_taken" };
      }

      try {
        const results = await database.batch([
          database
            .prepare(
              `UPDATE auth_identities
               SET subject = ?1, verified_at = ?2
               WHERE user_id = ?3 AND provider = 'email' AND subject = ?4`,
            )
            .bind(newEmail, now.getTime(), userId, currentEmail),
          database
            .prepare("UPDATE users SET updated_at = ?1 WHERE id = ?2")
            .bind(now.getTime(), userId),
          database
            .prepare(
              `UPDATE sessions
               SET revoked_at = ?1
               WHERE user_id = ?2 AND token_hash <> ?3 AND revoked_at IS NULL`,
            )
            .bind(now.getTime(), userId, currentSessionTokenHash),
        ]);

        if (!results[0]?.meta?.changes) {
          return { status: "stale_current" };
        }
      } catch (error) {
        const racedUser = await getUserByEmail(newEmail);
        if (racedUser && racedUser.id !== userId) {
          return { status: "email_taken" };
        }
        throw error;
      }

      const user = await getUserById(userId);
      if (!user) {
        throw new Error("User not found after email change.");
      }
      return { status: "changed", user };
    },

    async getUserBySessionTokenHash(tokenHash: string, now: Date): Promise<User | null> {
      const rows = await db
        .select({ user: users })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(
          and(
            eq(sessions.tokenHash, tokenHash),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, now),
          ),
        )
        .limit(1)
        .all();

      return rows[0] ? mapUser(rows[0].user) : null;
    },

    async revokeSession(tokenHash: string, revokedAt: Date): Promise<void> {
      await db
        .update(sessions)
        .set({ revokedAt })
        .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)))
        .run();
    },

    async updateDisplayName(
      userId: string,
      displayName: string | null,
      now: Date,
    ): Promise<User> {
      await db
        .update(users)
        .set({ displayName, updatedAt: now })
        .where(eq(users.id, userId))
        .run();

      const user = await getUserById(userId);
      if (!user) {
        throw new Error("User not found.");
      }
      return user;
    },
  };
}

export { createD1AuthRepository };
