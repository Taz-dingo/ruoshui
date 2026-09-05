import assert from "node:assert/strict";
import test from "node:test";
import type { User } from "@ruoshui/shared";

import {
  AuthServiceError,
  createAuthService,
  type AuthEmailSender,
  type AuthOtpChallengeRecord,
  type AuthOtpPurpose,
  type AuthRepository,
  type AuthSessionRecord,
} from "../lib/auth.js";

function createInMemoryAuthHarness() {
  let currentTime = new Date("2026-09-06T00:00:00.000Z");
  const challenges: AuthOtpChallengeRecord[] = [];
  const sessions: AuthSessionRecord[] = [];
  const usersByEmail = new Map<string, User>();
  const usersById = new Map<string, User>();
  const sentCodes: Array<{ code: string; email: string }> = [];

  const repository: AuthRepository = {
    async createOtpChallenge(record) {
      challenges.push({ ...record });
    },
    async getLatestOtpChallenge(subject, purpose: AuthOtpPurpose) {
      return (
        challenges
          .filter((challenge) => challenge.subject === subject && challenge.purpose === purpose)
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null
      );
    },
    async incrementOtpAttempt(id) {
      const challenge = challenges.find((entry) => entry.id === id);
      if (challenge) {
        challenge.attemptCount += 1;
      }
    },
    async consumeOtpChallenge(id, consumedAt) {
      const challenge = challenges.find((entry) => entry.id === id);
      if (challenge && challenge.consumedAt === null) {
        challenge.consumedAt = consumedAt;
      }
    },
    async getOrCreateUserByEmail(email, now) {
      const existing = usersByEmail.get(email);
      if (existing) {
        return existing;
      }

      const id = `user_${usersByEmail.size + 1}`;
      const created: User = {
        id,
        displayName: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      usersByEmail.set(email, created);
      usersById.set(id, created);
      return created;
    },
    async createSession(record) {
      sessions.push({ ...record });
    },
    async getUserBySessionTokenHash(tokenHash, now) {
      const session = sessions.find(
        (entry) =>
          entry.tokenHash === tokenHash &&
          entry.revokedAt === null &&
          entry.expiresAt.getTime() > now.getTime(),
      );
      return session ? usersById.get(session.userId) ?? null : null;
    },
    async revokeSession(tokenHash, revokedAt) {
      const session = sessions.find((entry) => entry.tokenHash === tokenHash);
      if (session && session.revokedAt === null) {
        session.revokedAt = revokedAt;
      }
    },
    async updateDisplayName(userId, displayName, now) {
      const user = usersById.get(userId);
      if (!user) {
        throw new Error("User not found");
      }
      const updated = { ...user, displayName, updatedAt: now.toISOString() };
      usersById.set(userId, updated);
      for (const [email, candidate] of usersByEmail) {
        if (candidate.id === userId) {
          usersByEmail.set(email, updated);
        }
      }
      return updated;
    },
  };

  const emailSender: AuthEmailSender = {
    async sendLoginOtp({ code, email }) {
      sentCodes.push({ code, email });
    },
  };

  const service = createAuthService({
    repository,
    emailSender,
    otpSecret: "test-secret-that-never-leaves-the-server",
    now: () => new Date(currentTime),
  });

  return {
    advance(milliseconds: number) {
      currentTime = new Date(currentTime.getTime() + milliseconds);
    },
    challenges,
    sentCodes,
    service,
    sessions,
    usersByEmail,
  };
}

test("OTP request normalizes email and stores only a hash", async () => {
  const harness = createInMemoryAuthHarness();

  await harness.service.requestLoginOtp("  Alumna@Example.COM ");

  assert.equal(harness.sentCodes.length, 1);
  assert.equal(harness.sentCodes[0]?.email, "alumna@example.com");
  assert.match(harness.sentCodes[0]?.code ?? "", /^\d{6}$/);
  assert.equal(harness.challenges.length, 1);
  assert.equal(harness.challenges[0]?.subject, "alumna@example.com");
  assert.notEqual(harness.challenges[0]?.codeHash, harness.sentCodes[0]?.code);
  assert.equal(harness.challenges[0]?.codeHash.length, 64);
});

test("OTP requests are rate limited for one minute", async () => {
  const harness = createInMemoryAuthHarness();
  await harness.service.requestLoginOtp("user@example.com");

  await assert.rejects(
    () => harness.service.requestLoginOtp("user@example.com"),
    (error) => error instanceof AuthServiceError && error.status === 429,
  );

  harness.advance(60_001);
  await harness.service.requestLoginOtp("user@example.com");
  assert.equal(harness.sentCodes.length, 2);
});

test("wrong OTP increments attempts and correct OTP creates a persistent session", async () => {
  const harness = createInMemoryAuthHarness();
  await harness.service.requestLoginOtp("user@example.com");
  const code = harness.sentCodes[0]?.code;
  assert.ok(code);

  await assert.rejects(
    () => harness.service.verifyLoginOtp("user@example.com", "000000"),
    (error) => error instanceof AuthServiceError && error.status === 400,
  );
  assert.equal(harness.challenges[0]?.attemptCount, 1);

  const login = await harness.service.verifyLoginOtp("user@example.com", code);
  assert.equal(login.user.id, "user_1");
  assert.notEqual(harness.sessions[0]?.tokenHash, login.sessionToken);

  const restored = await harness.service.getUserForSessionToken(login.sessionToken);
  assert.equal(restored?.id, login.user.id);

  await harness.service.logout(login.sessionToken);
  assert.equal(await harness.service.getUserForSessionToken(login.sessionToken), null);
});

test("logging in again with the same email reuses the same User", async () => {
  const harness = createInMemoryAuthHarness();
  await harness.service.requestLoginOtp("user@example.com");
  const firstCode = harness.sentCodes[0]?.code;
  assert.ok(firstCode);
  const firstLogin = await harness.service.verifyLoginOtp("user@example.com", firstCode);

  harness.advance(60_001);
  await harness.service.requestLoginOtp("user@example.com");
  const secondCode = harness.sentCodes[1]?.code;
  assert.ok(secondCode);
  const secondLogin = await harness.service.verifyLoginOtp("user@example.com", secondCode);

  assert.equal(secondLogin.user.id, firstLogin.user.id);
  assert.equal(harness.usersByEmail.size, 1);
});

test("display name remains optional and can be set after login", async () => {
  const harness = createInMemoryAuthHarness();
  await harness.service.requestLoginOtp("user@example.com");
  const code = harness.sentCodes[0]?.code;
  assert.ok(code);
  const login = await harness.service.verifyLoginOtp("user@example.com", code);

  assert.equal(login.user.displayName, null);
  const updated = await harness.service.updateDisplayName(login.user.id, "河海校友");
  assert.equal(updated.displayName, "河海校友");
});
