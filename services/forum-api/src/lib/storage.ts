import type { R2Bucket } from "@cloudflare/workers-types";
import { uploadRequestSchema, type UploadTicket } from "@ruoshui/shared";

type StorageProviderName = "none" | "alioss" | "r2";
type StorageProviderStatusCode = 400 | 401 | 413 | 501;

interface UploadObjectInput {
  objectKey: string;
  request: Request;
}

interface UploadObjectResult {
  contentType: string;
  objectKey: string;
  publicUrl?: string;
  sizeBytes: number;
}

interface StorageProvider {
  createUploadTicket(input: unknown): Promise<UploadTicket>;
  readonly name: StorageProviderName;
  uploadObject?(input: UploadObjectInput): Promise<UploadObjectResult>;
}

interface AliOssStorageProviderOptions {
  publicBaseUrl?: string;
}

interface R2StorageProviderOptions {
  bucket: R2Bucket;
  bucketName: string;
  publicApiBaseUrl: string;
  publicBaseUrl?: string;
  uploadSigningSecret: string;
}

class StorageProviderError extends Error {
  readonly status: StorageProviderStatusCode;

  constructor(status: StorageProviderStatusCode, message: string) {
    super(message);
    this.name = "StorageProviderError";
    this.status = status;
  }
}

class NoopStorageProvider implements StorageProvider {
  readonly name = "none" as const;

  async createUploadTicket(input: unknown): Promise<UploadTicket> {
    const payload = uploadRequestSchema.parse(input);
    const now = new Date();
    const objectKey = `draft/${now.getTime()}-${sanitizeFileName(payload.fileName)}`;

    return {
      provider: this.name,
      method: "PUT",
      objectKey,
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      headers: {},
      fields: {},
      note: "OSS 尚未接入，当前返回的是本地开发占位 ticket。",
    };
  }
}

class AliOssStorageProvider implements StorageProvider {
  readonly name = "alioss" as const;
  readonly publicBaseUrl: string;

  constructor(options: AliOssStorageProviderOptions = {}) {
    this.publicBaseUrl = options.publicBaseUrl?.trim() ?? "";
  }

  async createUploadTicket(input: unknown): Promise<UploadTicket> {
    const payload = uploadRequestSchema.parse(input);
    const now = new Date();
    const objectKey = `uploads/${now.getUTCFullYear()}/${now.getUTCMonth() + 1}/${now.getTime()}-${sanitizeFileName(payload.fileName)}`;

    return {
      provider: this.name,
      method: "PUT",
      uploadUrl: this.publicBaseUrl ? `${this.publicBaseUrl}/${objectKey}` : undefined,
      publicUrl: this.publicBaseUrl ? `${this.publicBaseUrl}/${objectKey}` : undefined,
      objectKey,
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      headers: {
        "content-type": payload.mimeType,
      },
      fields: {},
      note: "这里先保留 OSS 抽象与 contract，真实签名逻辑会在接入具体 OSS SDK 后补上。",
    };
  }
}

class R2StorageProvider implements StorageProvider {
  readonly name = "r2" as const;
  readonly bucket: R2Bucket;
  readonly bucketName: string;
  readonly publicApiBaseUrl: string;
  readonly publicBaseUrl?: string;
  readonly uploadSigningSecret: string;

  constructor(options: R2StorageProviderOptions) {
    this.bucket = options.bucket;
    this.bucketName = options.bucketName;
    this.publicApiBaseUrl = options.publicApiBaseUrl;
    this.publicBaseUrl = options.publicBaseUrl?.trim() || undefined;
    this.uploadSigningSecret = options.uploadSigningSecret;
  }

  async createUploadTicket(input: unknown): Promise<UploadTicket> {
    const payload = uploadRequestSchema.parse(input);
    const now = new Date();
    const objectKey = `uploads/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${now.getTime()}-${sanitizeFileName(payload.fileName)}`;
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    const uploadUrl = new URL(
      `/api/storage/objects/${encodeURIComponent(objectKey)}`,
      ensureTrailingSlash(this.publicApiBaseUrl),
    ).toString();
    const token = await signUploadToken(
      {
        expiresAt,
        mimeType: payload.mimeType,
        objectKey,
        sizeBytes: payload.sizeBytes,
      },
      this.uploadSigningSecret,
    );

    return {
      provider: this.name,
      method: "PUT",
      uploadUrl,
      objectKey,
      publicUrl: buildPublicUrl(this.publicBaseUrl, objectKey),
      expiresAt,
      headers: {
        "content-type": payload.mimeType,
        "x-ruoshui-upload-expires": expiresAt,
        "x-ruoshui-upload-size": String(payload.sizeBytes),
        "x-ruoshui-upload-token": token,
      },
      fields: {},
      note: "当前通过 Worker 代理把媒体写入 Cloudflare R2，适合先打通本地与预发链路。",
    };
  }

  async uploadObject(input: UploadObjectInput): Promise<UploadObjectResult> {
    const token = input.request.headers.get("x-ruoshui-upload-token");
    const expiresAt = input.request.headers.get("x-ruoshui-upload-expires");
    const sizeHeader = input.request.headers.get("x-ruoshui-upload-size");
    const contentType = input.request.headers.get("content-type")?.split(";")[0]?.trim();

    if (!token || !expiresAt || !sizeHeader || !contentType) {
      throw new StorageProviderError(
        400,
        "Missing upload headers. Request must include token, expiry, size, and content-type.",
      );
    }

    const sizeBytes = Number.parseInt(sizeHeader, 10);
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      throw new StorageProviderError(400, "Invalid upload size header.");
    }

    const isValid = await verifyUploadToken(
      {
        expiresAt,
        mimeType: contentType,
        objectKey: input.objectKey,
        sizeBytes,
      },
      token,
      this.uploadSigningSecret,
    );
    if (!isValid) {
      throw new StorageProviderError(401, "Invalid or expired upload token.");
    }

    const body = await input.request.arrayBuffer();
    if (body.byteLength !== sizeBytes) {
      throw new StorageProviderError(
        413,
        `Upload size mismatch. Expected ${sizeBytes} bytes, received ${body.byteLength}.`,
      );
    }

    await this.bucket.put(input.objectKey, body, {
      httpMetadata: {
        contentType,
      },
    });

    return {
      contentType,
      objectKey: input.objectKey,
      publicUrl: buildPublicUrl(this.publicBaseUrl, input.objectKey),
      sizeBytes: body.byteLength,
    };
  }
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function buildPublicUrl(publicBaseUrl: string | undefined, objectKey: string): string | undefined {
  if (!publicBaseUrl) {
    return undefined;
  }

  return new URL(objectKey, ensureTrailingSlash(publicBaseUrl)).toString();
}

function serializeUploadPayload(input: {
  expiresAt: string;
  mimeType: string;
  objectKey: string;
  sizeBytes: number;
}): string {
  return JSON.stringify(input);
}

async function signUploadToken(
  input: {
    expiresAt: string;
    mimeType: string;
    objectKey: string;
    sizeBytes: number;
  },
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(serializeUploadPayload(input)),
  );

  return Array.from(new Uint8Array(signature), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

async function verifyUploadToken(
  input: {
    expiresAt: string;
    mimeType: string;
    objectKey: string;
    sizeBytes: number;
  },
  token: string,
  secret: string,
): Promise<boolean> {
  const expiresAtMillis = Date.parse(input.expiresAt);
  if (!Number.isFinite(expiresAtMillis) || expiresAtMillis < Date.now()) {
    return false;
  }

  const expected = await signUploadToken(input, secret);
  return token === expected;
}

function createAliOssStorageProvider(
  options: AliOssStorageProviderOptions = {},
): StorageProvider {
  return new AliOssStorageProvider(options);
}

function createNoopStorageProvider(): StorageProvider {
  return new NoopStorageProvider();
}

function createR2StorageProvider(options: R2StorageProviderOptions): StorageProvider {
  return new R2StorageProvider(options);
}

export {
  StorageProviderError,
  createAliOssStorageProvider,
  createNoopStorageProvider,
  createR2StorageProvider,
};

export type {
  StorageProvider,
  StorageProviderName,
  StorageProviderStatusCode,
  UploadObjectInput,
  UploadObjectResult,
};
