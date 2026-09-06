import type { User } from "@ruoshui/shared";

import { createEntityId } from "./id.js";

const DEFAULT_OTP_TTL_MS = 10 * 60 * 1000;
const DEFAULT_OTP_RESEND_INTERVAL_MS = 60 * 1000;
const DEFAULT_OTP_MAX_ATTEMPTS = 5;
const DEFAULT_SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const EMAIL_CHANGE_PROOF_VERSION = 1;

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

interface AuthEmailChangeRepositoryResult {
  status: "changed" | "email_taken" | "stale_current";
  user?: User;
}

interface AuthRepository {
  changeEmailForUser(
    userId: string,
    currentEmail: string,
    newEmail: string,
    currentSessionTokenHash: string,
    now: Date,
  ): Promise<AuthEmailChangeRepositoryResult>;
  consumeOtpChallenge(id: string, consumedAt: Date): Promise<void>;
  createOtpChallenge(record: AuthOtpChallengeRecord): Promise<void>;
  createSession(record: AuthSessionRecord): Promise<void>;
  getEmailForUser(userId: string): Promise<string | null>;
  getLatestOtpChallenge(subject: string, purpose: AuthOtpPurpose): Promise<AuthOtpChallengeRecord | null>;
  getOrCreateUserByEmail(email: string, now: Date): Promise<User>;
  getUserBySessionTokenHash(tokenHash: string, now: Date): Promise<User | null>;
  getUserIdByEmail(email: string): Promise<string | null>;
  incrementOtpAttempt(id: string): Promise<void>;
  revokeSession(tokenHash: string, revokedAt: Date): Promise<void>;
  updateDisplayName(userId: string, displayName: string | null, now: Date): Promise<User>;
}

interface AuthEmailSender {
  sendOtp(input: {
    code: string;
    email: string;
    expiresInMinutes: number;
    purpose: AuthOtpPurpose;
  }): Promise<void>;
}

interface EmailChangeProofResult {
  expiresAt: Date;
  proof: string;
}

interface AuthService {
  getEmailForUser(userId: string): Promise<string>;
  getUserForSessionToken(sessionToken: string | undefined): Promise<User | null>;
  logout(sessionToken: string | undefined): Promise<void>;
  requestCurrentEmailChangeOtp(userId: string): Promise<{ email: string }>;
  requestLoginOtp(email: string): Promise<void>;
  requestNewEmailChangeOtp(
    userId: string,
    sessionToken: string | undefined,
    proof: string,
    newEmail: string,
  ): Promise<void>;
  updateDisplayName(userId: string, displayName: string | null): Promise<User>;
  verifyCurrentEmailChangeOtp(
    userId: string,
    sessionToken: string | undefined,
    code: string,
  ): Promise<EmailChangeProofResult>;
  verifyLoginOtp(email: string, code: string): Promise<{
    expiresAt: Date;
    sessionToken: string;
    user: User;
  }>;
  verifyNewEmailChangeOtp(
    userId: string,
    sessionToken: string | undefined,
    proof: string,
    newEmail: string,
    code: string,
  ): Promise<{ email: string; user: User }>;
}

class AuthServiceError extends Error {
  readonly status: 400 | 401 | 409 | 429 | 503;

  constructor(message: string, status: 400 | 401 | 409 | 429 | 503) {
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

interface EmailChangeProofPayload {
  currentEmail: string;
  expiresAt: number;
  sessionTokenHash: string;
  userId: string;
  version: number;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string): Uint8Array | null {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) {
    return null;
  }
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
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

async function hashOtp(
  secret: string,
  purpose: AuthOtpPurpose,
  email: string,
  code: string,
): Promise<string> {
  return sha256Hex(`${secret}:${purpose}:${normalizeEmail(email)}:${code}`);
}

async function hashSessionToken(token: string): Promise<string> {
  return sha256Hex(`ruoshui-session:${token}`);
}

function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): string | null {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    return new TextDecoder().decode(
      Uint8Array.from(binary, (character) => character.charCodeAt(0)),
    );
  } catch {
    return null;
  }
}

async function importProofKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signEmailChangeProof(
  secret: string,
  payload: EmailChangeProofPayload,
): Promise<string> {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await importProofKey(secret),
    new TextEncoder().encode(`ruoshui-email-change-proof:v1:${encodedPayload}`),
  );
  return `${encodedPayload}.${bytesToHex(new Uint8Array(signature))}`;
}

async function readEmailChangeProof(
  secret: string,
  proof: string,
): Promise<EmailChangeProofPayload | null> {
  const parts = proof.split(".");
  if (parts.length !== 2) {
    return null;
  }
  const [encodedPayload, signatureHex] = parts;
  if (!encodedPayload || !signatureHex) {
    return null;
  }
  const signature = hexToBytes(signatureHex);
  if (!signature) {
    return null;
  }
  const valid = await crypto.subtle.verify(
    "HMAC",
    await importProofKey(secret),
    signature,
    new TextEncoder().encode(`ruoshui-email-change-proof:v1:${encodedPayload}`),
  );
  if (!valid) {
    return null;
  }
  const decoded = base64UrlDecode(encodedPayload);
  if (!decoded) {
    return null;
  }
  try {
    const payload = JSON.parse(decoded) as Partial<EmailChangeProofPayload>;
    if (
      payload.version !== EMAIL_CHANGE_PROOF_VERSION ||
      typeof payload.userId !== "string" ||
      typeof payload.currentEmail !== "string" ||
      typeof payload.sessionTokenHash !== "string" ||
      typeof payload.expiresAt !== "number"
    ) {
      return null;
    }
    return payload as EmailChangeProofPayload;
  } catch {
    return null;
  }
}

function createAuthService(options: CreateAuthServiceOptions): AuthService {
  const now = options.now ?? (() => new Date());
  const otpMaxAttempts = options.otpMaxAttempts ?? DEFAULT_OTP_MAX_ATTEMPTS;
  const otpResendIntervalMs = options.otpResendIntervalMs ?? DEFAULT_OTP_RESEND_INTERVAL_MS;
  const otpTtlMs = options.otpTtlMs ?? DEFAULT_OTP_TTL_MS;
  const sessionTtlMs = options.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS;

  async function getRequiredEmail(userId: string): Promise<string> {
    const email = await options.repository.getEmailForUser(userId);
    if (!email) {
      throw new AuthServiceError("This account does not have an email identity.", 503);
    }
    return normalizeEmail(email);
  }

  async function requestOtp(purpose: AuthOtpPurpose, rawEmail: string): Promise<void> {
    const email = normalizeEmail(rawEmail);
    const currentTime = now();
    const latest = await options.repository.getLatestOtpChallenge(email, purpose);

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
      purpose,
      codeHash: await hashOtp(options.otpSecret, purpose, email, code),
      expiresAt,
      consumedAt: null,
      attemptCount: 0,
      createdAt: currentTime,
    };

    await options.repository.createOtpChallenge(challenge);
    await options.emailSender.sendOtp({
      code,
      email,
      expiresInMinutes: Math.max(1, Math.round(otpTtlMs / 60_000)),
      purpose,
    });
  }

  async function verifyOtp(
    purpose: AuthOtpPurpose,
    rawEmail: string,
    code: string,
    currentTime: Date,
  ): Promise<AuthOtpChallengeRecord> {
    const email = normalizeEmail(rawEmail);
    const challenge = await options.repository.getLatestOtpChallenge(email, purpose);

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

    const candidateHash = await hashOtp(options.otpSecret, purpose, email, code);
    if (candidateHash !== challenge.codeHash) {
      await options.repository.incrementOtpAttempt(challenge.id);
      throw new AuthServiceError("The verification code is invalid or expired.", 400);
    }

    await options.repository.consumeOtpChallenge(challenge.id, currentTime);
    return challenge;
  }

  async function requireSessionForUser(
    userId: string,
    sessionToken: string | undefined,
    currentTime: Date,
  ): Promise<string> {
    if (!sessionToken) {
      throw new AuthServiceError("Authentication required.", 401);
    }
    const tokenHash = await hashSessionToken(sessionToken);
    const sessionUser = await options.repository.getUserBySessionTokenHash(tokenHash, currentTime);
    if (!sessionUser || sessionUser.id !== userId) {
      throw new AuthServiceError("Authentication required.", 401);
    }
    return tokenHash;
  }

  async function requireEmailChangeProof(
    userId: string,
    sessionToken: string | undefined,
    proof: string,
    currentTime: Date,
  ): Promise<{ currentEmail: string; sessionTokenHash: string }> {
    const sessionTokenHash = await requireSessionForUser(userId, sessionToken, currentTime);
    const payload = await readEmailChangeProof(options.otpSecret, proof);
    if (
      !payload ||
      payload.userId !== userId ||
      payload.sessionTokenHash !== sessionTokenHash ||
      payload.expiresAt <= currentTime.getTime()
    ) {
      throw new AuthServiceError(
        "Current email verification expired. Verify your current email again.",
        401,
      );
    }
    const currentEmail = await getRequiredEmail(userId);
    if (currentEmail !== normalizeEmail(payload.currentEmail)) {
      throw new AuthServiceError(
        "Current email verification expired. Verify your current email again.",
        401,
      );
    }
    return { currentEmail, sessionTokenHash };
  }

  async function ensureNewEmailAvailable(userId: string, rawEmail: string): Promise<string> {
    const email = normalizeEmail(rawEmail);
    const currentEmail = await getRequiredEmail(userId);
    if (email === currentEmail) {
      throw new AuthServiceError("The new email must be different from the current email.", 400);
    }
    const existingUserId = await options.repository.getUserIdByEmail(email);
    if (existingUserId) {
      throw new AuthServiceError("This email is already in use.", 409);
    }
    return email;
  }

  return {
    async requestLoginOtp(rawEmail: string): Promise<void> {
      await requestOtp("login", rawEmail);
    },

    async verifyLoginOtp(rawEmail: string, code: string) {
      const email = normalizeEmail(rawEmail);
      const currentTime = now();
      await verifyOtp("login", email, code, currentTime);
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

    async getEmailForUser(userId: string): Promise<string> {
      return getRequiredEmail(userId);
    },

    async requestCurrentEmailChangeOtp(userId: string) {
      const email = await getRequiredEmail(userId);
      await requestOtp("change_email_current", email);
      return { email };
    },

    async verifyCurrentEmailChangeOtp(userId, sessionToken, code) {
      const currentTime = now();
      const sessionTokenHash = await requireSessionForUser(userId, sessionToken, currentTime);
      const currentEmail = await getRequiredEmail(userId);
      await verifyOtp("change_email_current", currentEmail, code, currentTime);
      const expiresAt = new Date(currentTime.getTime() + otpTtlMs);
      return {
        proof: await signEmailChangeProof(options.otpSecret, {
          version: EMAIL_CHANGE_PROOF_VERSION,
          userId,
          currentEmail,
          sessionTokenHash,
          expiresAt: expiresAt.getTime(),
        }),
        expiresAt,
      };
    },

    async requestNewEmailChangeOtp(userId, sessionToken, proof, rawNewEmail) {
      const currentTime = now();
      await requireEmailChangeProof(userId, sessionToken, proof, currentTime);
      const newEmail = await ensureNewEmailAvailable(userId, rawNewEmail);
      await requestOtp("change_email_new", newEmail);
    },

    async verifyNewEmailChangeOtp(userId, sessionToken, proof, rawNewEmail, code) {
      const currentTime = now();
      const { currentEmail, sessionTokenHash } = await requireEmailChangeProof(
        userId,
        sessionToken,
        proof,
        currentTime,
      );
      const newEmail = await ensureNewEmailAvailable(userId, rawNewEmail);
      await verifyOtp("change_email_new", newEmail, code, currentTime);

      const result = await options.repository.changeEmailForUser(
        userId,
        currentEmail,
        newEmail,
        sessionTokenHash,
        currentTime,
      );
      if (result.status === "email_taken") {
        throw new AuthServiceError("This email is already in use.", 409);
      }
      if (result.status !== "changed" || !result.user) {
        throw new AuthServiceError(
          "Current email changed before this request completed. Start again.",
          409,
        );
      }
      return { email: newEmail, user: result.user };
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
  AuthEmailChangeRepositoryResult,
  AuthEmailSender,
  AuthOtpChallengeRecord,
  AuthOtpPurpose,
  AuthRepository,
  AuthService,
  AuthSessionRecord,
  CreateAuthServiceOptions,
  EmailChangeProofResult,
};
