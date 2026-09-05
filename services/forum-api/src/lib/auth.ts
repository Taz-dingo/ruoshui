import type { User } from "@ruoshui/shared";

import { createEntityId } from "./id.js";

const DEFAULT_OTP_TTL_MS = 10 * 60 * 1000;
const DEFAULT_OTP_RESEND_INTERVAL_MS = 60 * 1000;
const DEFAULT_OTP_MAX_ATTEMPTS = 5;
const DEFAULT_SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

type AuthOtpPurpose = "login" | "change_email_current" | "change_email_new";

interface AuthOtpChallengeRecord {
  id: string;
  subject: string;
  purpose: AuthOtpPurpose;
  codeHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  attemptCount: number;
  createdAt: Date;
}

interface AuthSessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

interface AuthRepository {
  consumeOtpChallenge(id: string, consumedAt: Date): Promise<void>;
  createOtpChallenge(record: AuthOtpChallengeRecord): Promise<void>;
  createSession(record: AuthSessionRecord): Promise<void>;
  getLatestOtpChallenge(subject: string, purpose: AuthOtpPurpose): Promise<AuthOtpChallengeRecord | null>;
  getOrCreateUserByEmail(email: string, now: Date): Promise<User>;
  getUserBySessionTokenHash(tokenHash: string, now: Date): Promise<User | null>;
  incrementOtpAttempt(id: string): Promise<void>;
  revokeSession(tokenHash: string, revokedAt: Date): Promise<void>;
  updateDisplayName(userId: string, displayName: string | null, now: Date): Promise<User>;
}

interface AuthEmailSender {
  sendLoginOtp(input: { code: string; email: string; expiresInMinutes: number }): Promise<void>;
}

interface AuthService {
  getUserForSessionToken(sessionToken: string | undefined): Promise<User | null>;
  logout(sessionToken: string | undefined): Promise<void>;
  requestLoginOtp(email: string): Promise<void>;
  updateDisplayName(userId: string, displayName: string | null): Promise<User>;
  verifyLoginOtp(email: string, code: string): Promise<{
    expiresAt: Date;
    sessionToken: string;
    user: User;
  }>;
}

class AuthServiceError extends Error {
  readonly status: 400 | 401 | 429 | 503;

  constructor(message: string, status: 400 | 401 | 429 | 503) {
    super(message);
    this.name = "AuthServiceError";
    this.status = status;
  }
}

interface CreateAuthServiceOptions {
  emailSender: AuthEmailSender;
  now?: () => Date;
  otpMaxAttempts?: number;
  otpResendIntervalMs?: number;
  otpSecret: string;
  otpTtlMs?: number;
  repository: AuthRepository;
  sessionTtlMs?: number;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createRandomToken(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function createOtpCode(): string {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return String(random[0] % 1_000_000).padStart(6, "0");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function hashOtp(secret: string, email: string, code: string): Promise<string> {
  return sha256Hex(`${secret}:login:${normalizeEmail(email)}:${code}`);
}

async function hashSessionToken(token: string): Promise<string> {
  return sha256Hex(`ruoshui-session:${token}`);
}

function createAuthService(options: CreateAuthServiceOptions): AuthService {
  const now = options.now ?? (() => new Date());
  const otpMaxAttempts = options.otpMaxAttempts ?? DEFAULT_OTP_MAX_ATTEMPTS;
  const otpResendIntervalMs = options.otpResendIntervalMs ?? DEFAULT_OTP_RESEND_INTERVAL_MS;
  const otpTtlMs = options.otpTtlMs ?? DEFAULT_OTP_TTL_MS;
  const sessionTtlMs = options.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS;

  return {
    async requestLoginOtp(rawEmail: string): Promise<void> {
      const email = normalizeEmail(rawEmail);
      const currentTime = now();
      const latest = await options.repository.getLatestOtpChallenge(email, "login");

      if (
        latest &&
        latest.consumedAt === null &&
        currentTime.getTime() - latest.createdAt.getTime() < otpResendIntervalMs
      ) {
        throw new AuthServiceError("Please wait before requesting another code.", 429);
      }

      const code = createOtpCode();
      const expiresAt = new Date(currentTime.getTime() + otpTtlMs);
      const challenge: AuthOtpChallengeRecord = {
        id: createEntityId("otp"),
        subject: email,
        purpose: "login",
        codeHash: await hashOtp(options.otpSecret, email, code),
        expiresAt,
        consumedAt: null,
        attemptCount: 0,
        createdAt: currentTime,
      };

      await options.repository.createOtpChallenge(challenge);
      await options.emailSender.sendLoginOtp({
        code,
        email,
        expiresInMinutes: Math.max(1, Math.round(otpTtlMs / 60_000)),
      });
    },

    async verifyLoginOtp(rawEmail: string, code: string) {
      const email = normalizeEmail(rawEmail);
      const currentTime = now();
      const challenge = await options.repository.getLatestOtpChallenge(email, "login");

      if (
        !challenge ||
        challenge.consumedAt !== null ||
        challenge.expiresAt.getTime() <= currentTime.getTime()
      ) {
        throw new AuthServiceError("The verification code is invalid or expired.", 400);
      }

      if (challenge.attemptCount >= otpMaxAttempts) {
        throw new AuthServiceError("Too many verification attempts. Request a new code.", 429);
      }

      const candidateHash = await hashOtp(options.otpSecret, email, code);
      if (candidateHash !== challenge.codeHash) {
        await options.repository.incrementOtpAttempt(challenge.id);
        throw new AuthServiceError("The verification code is invalid or expired.", 400);
      }

      await options.repository.consumeOtpChallenge(challenge.id, currentTime);
      const user = await options.repository.getOrCreateUserByEmail(email, currentTime);
      const sessionToken = createRandomToken(32);
      const tokenHash = await hashSessionToken(sessionToken);
      const expiresAt = new Date(currentTime.getTime() + sessionTtlMs);

      await options.repository.createSession({
        id: createEntityId("session"),
        userId: user.id,
        tokenHash,
        expiresAt,
        revokedAt: null,
        createdAt: currentTime,
      });

      return { expiresAt, sessionToken, user };
    },

    async getUserForSessionToken(sessionToken: string | undefined): Promise<User | null> {
      if (!sessionToken) {
        return null;
      }

      return options.repository.getUserBySessionTokenHash(
        await hashSessionToken(sessionToken),
        now(),
      );
    },

    async logout(sessionToken: string | undefined): Promise<void> {
      if (!sessionToken) {
        return;
      }

      await options.repository.revokeSession(await hashSessionToken(sessionToken), now());
    },

    async updateDisplayName(userId: string, displayName: string | null): Promise<User> {
      return options.repository.updateDisplayName(userId, displayName, now());
    },
  };
}

export {
  AuthServiceError,
  createAuthService,
  hashSessionToken,
  normalizeEmail,
};
export type {
  AuthEmailSender,
  AuthOtpChallengeRecord,
  AuthOtpPurpose,
  AuthRepository,
  AuthService,
  AuthSessionRecord,
  CreateAuthServiceOptions,
};
