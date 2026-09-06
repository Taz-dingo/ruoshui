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
  const sentCodes: Array<{ code: string; email: string; purpose: AuthOtpPurpose }> = [];

  function getEmailForUserId(userId: string) {
    for (const [email, user] of usersByEmail) {
      if (user.id === userId) return email;
    }
    return null;
  }

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

      const id = `user_${usersById.size + 1}`;
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
    async getEmailForUser(userId) {
      return getEmailForUserId(userId);
    },
    async getUserIdByEmail(email) {
      return usersByEmail.get(email)?.id ?? null;
    },
    async changeEmailForUser(userId, currentEmail, newEmail, currentSessionTokenHash, now) {
      const currentUser = usersByEmail.get(currentEmail);
      if (!currentUser || currentUser.id !== userId) {
        return { status: "stale_current" as const };
      }
      if (usersByEmail.has(newEmail)) {
        return { status: "email_taken" as const };
      }

      const updated = { ...currentUser, updatedAt: now.toISOString() };
      usersByEmail.delete(currentEmail);
      usersByEmail.set(newEmail, updated);
      usersById.set(userId, updated);
      for (const session of sessions) {
        if (
          session.userId === userId &&
          session.tokenHash !== currentSessionTokenHash &&
          session.revokedAt === null
        ) {
          session.revokedAt = now;
        }
      }
      return { status: "changed" as const, user: updated };
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
    async sendOtp({ code, email, purpose }) {
      sentCodes.push({ code, email, purpose });
    },
  };

  const service = createAuthService({
    repository,
    emailSender,
    otpSecret: "test-secret-that-never-leaves-the-server",
    now: () => new Date(currentTime),
  });

  function latestCode(purpose: AuthOtpPurpose, email?: string) {
    const match = [...sentCodes]
      .reverse()
      .find((entry) => entry.purpose === purpose && (!email || entry.email === email));
    assert.ok(match);
    return match.code;
  }

  async function login(email: string) {
    await service.requestLoginOtp(email);
    return service.verifyLoginOtp(email, latestCode("login", email));
  }

  return {
    advance(milliseconds: number) {
      currentTime = new Date(currentTime.getTime() + milliseconds);
    },
    challenges,
    latestCode,
    login,
    sentCodes,
    service,
    sessions,
    usersByEmail,
  };
}

test("OTP request normalizes email and stores only a purpose-bound hash", async () => {
  const harness = createInMemoryAuthHarness();

  await harness.service.requestLoginOtp("  Alumna@Example.COM ");

  assert.equal(harness.sentCodes.length, 1);
  assert.equal(harness.sentCodes[0]?.email, "alumna@example.com");
  assert.equal(harness.sentCodes[0]?.purpose, "login");
  assert.match(harness.sentCodes[0]?.code ?? "", /^\d{6}$/);
  assert.equal(harness.challenges.length, 1);
  assert.equal(harness.challenges[0]?.subject, "alumna@example.com");
  assert.equal(harness.challenges[0]?.purpose, "login");
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
  const code = harness.latestCode("login", "user@example.com");

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
  const firstLogin = await harness.login("user@example.com");

  harness.advance(60_001);
  const secondLogin = await harness.login("user@example.com");

  assert.equal(secondLogin.user.id, firstLogin.user.id);
  assert.equal(harness.usersByEmail.size, 1);
});

test("display name remains optional and can be set after login", async () => {
  const harness = createInMemoryAuthHarness();
  const login = await harness.login("user@example.com");

  assert.equal(login.user.displayName, null);
  const updated = await harness.service.updateDisplayName(login.user.id, "河海校友");
  assert.equal(updated.displayName, "河海校友");
});

test("email change requires the current email OTP before a new address can be verified", async () => {
  const harness = createInMemoryAuthHarness();
  const login = await harness.login("old@example.com");

  await harness.service.requestCurrentEmailChangeOtp(login.user.id);
  await assert.rejects(
    () =>
      harness.service.verifyCurrentEmailChangeOtp(
        login.user.id,
        login.sessionToken,
        "000000",
      ),
    (error) => error instanceof AuthServiceError && error.status === 400,
  );

  const proof = await harness.service.verifyCurrentEmailChangeOtp(
    login.user.id,
    login.sessionToken,
    harness.latestCode("change_email_current", "old@example.com"),
  );
  assert.ok(proof.proof.includes("."));
});

test("email change proof is session-bound and rejects tampering or expiry", async () => {
  const harness = createInMemoryAuthHarness();
  const login = await harness.login("old@example.com");
  await harness.service.requestCurrentEmailChangeOtp(login.user.id);
  const proof = await harness.service.verifyCurrentEmailChangeOtp(
    login.user.id,
    login.sessionToken,
    harness.latestCode("change_email_current", "old@example.com"),
  );

  const tampered = `${proof.proof.slice(0, -1)}${proof.proof.endsWith("0") ? "1" : "0"}`;
  await assert.rejects(
    () =>
      harness.service.requestNewEmailChangeOtp(
        login.user.id,
        login.sessionToken,
        tampered,
        "new@example.com",
      ),
    (error) => error instanceof AuthServiceError && error.status === 401,
  );

  harness.advance(10 * 60 * 1000 + 1);
  await assert.rejects(
    () =>
      harness.service.requestNewEmailChangeOtp(
        login.user.id,
        login.sessionToken,
        proof.proof,
        "new@example.com",
      ),
    (error) => error instanceof AuthServiceError && error.status === 401,
  );
});

test("email change rejects the current address and an address owned by another User", async () => {
  const harness = createInMemoryAuthHarness();
  const login = await harness.login("old@example.com");
  harness.advance(60_001);
  await harness.login("taken@example.com");

  await harness.service.requestCurrentEmailChangeOtp(login.user.id);
  const proof = await harness.service.verifyCurrentEmailChangeOtp(
    login.user.id,
    login.sessionToken,
    harness.latestCode("change_email_current", "old@example.com"),
  );

  await assert.rejects(
    () =>
      harness.service.requestNewEmailChangeOtp(
        login.user.id,
        login.sessionToken,
        proof.proof,
        "old@example.com",
      ),
    (error) => error instanceof AuthServiceError && error.status === 400,
  );
  await assert.rejects(
    () =>
      harness.service.requestNewEmailChangeOtp(
        login.user.id,
        login.sessionToken,
        proof.proof,
        "taken@example.com",
      ),
    (error) => error instanceof AuthServiceError && error.status === 409,
  );
});

test("successful email change keeps the same User and current session but revokes other sessions", async () => {
  const harness = createInMemoryAuthHarness();
  const currentLogin = await harness.login("old@example.com");
  harness.advance(60_001);
  const otherLogin = await harness.login("old@example.com");

  await harness.service.requestCurrentEmailChangeOtp(currentLogin.user.id);
  const proof = await harness.service.verifyCurrentEmailChangeOtp(
    currentLogin.user.id,
    currentLogin.sessionToken,
    harness.latestCode("change_email_current", "old@example.com"),
  );
  await harness.service.requestNewEmailChangeOtp(
    currentLogin.user.id,
    currentLogin.sessionToken,
    proof.proof,
    "new@example.com",
  );
  const changed = await harness.service.verifyNewEmailChangeOtp(
    currentLogin.user.id,
    currentLogin.sessionToken,
    proof.proof,
    "new@example.com",
    harness.latestCode("change_email_new", "new@example.com"),
  );

  assert.equal(changed.user.id, currentLogin.user.id);
  assert.equal(changed.email, "new@example.com");
  assert.equal(harness.usersByEmail.has("old@example.com"), false);
  assert.equal(harness.usersByEmail.get("new@example.com")?.id, currentLogin.user.id);
  assert.equal(
    (await harness.service.getUserForSessionToken(currentLogin.sessionToken))?.id,
    currentLogin.user.id,
  );
  assert.equal(await harness.service.getUserForSessionToken(otherLogin.sessionToken), null);

  await assert.rejects(
    () =>
      harness.service.requestNewEmailChangeOtp(
        currentLogin.user.id,
        currentLogin.sessionToken,
        proof.proof,
        "another@example.com",
      ),
    (error) => error instanceof AuthServiceError && error.status === 401,
  );
});
