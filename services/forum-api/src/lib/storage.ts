import { uploadRequestSchema, type UploadRequest, type UploadTicket } from "@ruoshui/shared";

import { env } from "../env.js";

type StorageProviderName = "none" | "alioss";

interface StorageProvider {
  createUploadTicket(input: UploadRequest): Promise<UploadTicket>;
  readonly name: StorageProviderName;
}

class NoopStorageProvider implements StorageProvider {
  readonly name = "none" as const;

  async createUploadTicket(input: UploadRequest): Promise<UploadTicket> {
    const now = new Date();
    const objectKey = `draft/${now.getTime()}-${sanitizeFileName(input.fileName)}`;

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

  async createUploadTicket(input: UploadRequest): Promise<UploadTicket> {
    const now = new Date();
    const objectKey = `uploads/${now.getUTCFullYear()}/${now.getUTCMonth() + 1}/${now.getTime()}-${sanitizeFileName(input.fileName)}`;
    const publicBaseUrl = env.OSS_PUBLIC_BASE_URL.trim();

    return {
      provider: this.name,
      method: "PUT",
      uploadUrl: publicBaseUrl ? `${publicBaseUrl}/${objectKey}` : undefined,
      publicUrl: publicBaseUrl ? `${publicBaseUrl}/${objectKey}` : undefined,
      objectKey,
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      headers: {
        "content-type": input.mimeType,
      },
      fields: {},
      note: "这里先保留 OSS 抽象与 contract，真实签名逻辑会在接入具体 OSS SDK 后补上。",
    };
  }
}

const storageProvider =
  env.OSS_PROVIDER === "alioss" ? new AliOssStorageProvider() : new NoopStorageProvider();

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function createUploadTicket(input: unknown): Promise<UploadTicket> {
  const payload = uploadRequestSchema.parse(input);

  return storageProvider.createUploadTicket(payload);
}

function getStorageProviderName(): StorageProviderName {
  return storageProvider.name;
}

export { createUploadTicket, getStorageProviderName };
