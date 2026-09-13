import assert from "node:assert/strict";
import test from "node:test";

import type { AlumniIdentity, UploadTicket } from "@ruoshui/shared";

import {
  UserProfileServiceError,
  createUserProfileService,
  type StoredUserProfile,
  type UserProfileRepository,
} from "./profile.js";
import type { StorageProvider } from "./storage.js";

function createRepository(): UserProfileRepository {
  const profiles = new Map<string, StoredUserProfile>();
  const get = (userId: string) => profiles.get(userId) ?? { avatarObjectKey: null, alumniIdentity: null };
  return {
    async getProfile(userId) {
      return get(userId);
    },
    async setAlumniIdentity(userId, alumniIdentity) {
      profiles.set(userId, { ...get(userId), alumniIdentity });
    },
    async setAvatarObjectKey(userId, avatarObjectKey) {
      profiles.set(userId, { ...get(userId), avatarObjectKey });
    },
  };
}

function createStorage(objects: Map<string, { contentType: string; contentLength: number }>): StorageProvider {
  return {
    name: "r2",
    async createUploadTicket(input, options): Promise<UploadTicket> {
      const payload = input as { fileName: string; mimeType: string; sizeBytes: number };
      const objectKey = `${options?.objectKeyPrefix ?? "uploads"}/1-${payload.fileName}`;
      return {
        provider: "r2",
        method: "PUT",
        uploadUrl: `https://example.test/${encodeURIComponent(objectKey)}`,
        objectKey,
        expiresAt: new Date("2030-01-01T00:00:00.000Z").toISOString(),
        headers: {},
        fields: {},
      };
    },
    async readObject(objectKey) {
      const object = objects.get(objectKey);
      return object ? { body: null, ...object } : null;
    },
  };
}

test("profile stores optional alumni identity", async () => {
  const service = createUserProfileService({
    repository: createRepository(),
    storageProvider: createStorage(new Map()),
  });
  const identity: AlumniIdentity = {
    enrollmentYear: 2019,
    graduationYear: 2023,
    department: "计算机学院",
    major: "计算机科学与技术",
  };
  const profile = await service.updateAlumniIdentity("user_1", identity);
  assert.deepEqual(profile.alumniIdentity, identity);
});

test("avatar confirmation only accepts current user prefix", async () => {
  const service = createUserProfileService({
    repository: createRepository(),
    storageProvider: createStorage(new Map()),
  });
  await assert.rejects(
    service.confirmAvatar("user_1", "profile-avatars/user_2/avatar.webp"),
    (error: unknown) => error instanceof UserProfileServiceError && error.status === 400,
  );
});

test("avatar confirmation requires an uploaded image object", async () => {
  const objectKey = "profile-avatars/user_1/avatar.webp";
  const service = createUserProfileService({
    repository: createRepository(),
    storageProvider: createStorage(new Map([[objectKey, { contentType: "image/webp", contentLength: 1024 }]])),
  });
  await service.confirmAvatar("user_1", objectKey);
  const profile = await service.getProfile("user_1");
  assert.equal(profile.avatarObjectKey, objectKey);
});
