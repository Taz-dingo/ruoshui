import type {
  AlumniIdentity,
  ProfileAvatarUploadInput,
  UploadTicket,
} from "@ruoshui/shared";

import type { ReadObjectResult, StorageProvider } from "./storage.js";

interface StoredUserProfile {
  avatarObjectKey: string | null;
  alumniIdentity: AlumniIdentity | null;
}

interface UserProfileRepository {
  getProfile(userId: string): Promise<StoredUserProfile>;
  setAlumniIdentity(userId: string, identity: AlumniIdentity | null, now: Date): Promise<void>;
  setAvatarObjectKey(userId: string, objectKey: string | null, now: Date): Promise<void>;
}

interface UserProfileService {
  clearAvatar(userId: string): Promise<void>;
  confirmAvatar(userId: string, objectKey: string): Promise<void>;
  createAvatarUploadTicket(userId: string, input: ProfileAvatarUploadInput): Promise<UploadTicket>;
  getAvatarObject(userId: string): Promise<ReadObjectResult | null>;
  getProfile(userId: string): Promise<StoredUserProfile>;
  updateAlumniIdentity(userId: string, identity: AlumniIdentity | null): Promise<StoredUserProfile>;
}

class UserProfileServiceError extends Error {
  readonly status: 400 | 404 | 413 | 501;

  constructor(message: string, status: 400 | 404 | 413 | 501) {
    super(message);
    this.name = "UserProfileServiceError";
    this.status = status;
  }
}

interface CreateUserProfileServiceOptions {
  now?: () => Date;
  repository: UserProfileRepository;
  storageProvider: StorageProvider;
}

const AVATAR_PREFIX = "profile-avatars";
const MAX_AVATAR_BYTES = 8 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function avatarPrefixForUser(userId: string): string {
  return `${AVATAR_PREFIX}/${userId}`;
}

function createUserProfileService(options: CreateUserProfileServiceOptions): UserProfileService {
  const now = options.now ?? (() => new Date());

  return {
    async getProfile(userId) {
      return options.repository.getProfile(userId);
    },

    async updateAlumniIdentity(userId, identity) {
      await options.repository.setAlumniIdentity(userId, identity, now());
      return options.repository.getProfile(userId);
    },

    async createAvatarUploadTicket(userId, input) {
      return options.storageProvider.createUploadTicket(
        {
          ...input,
          category: "post-inline",
        },
        { objectKeyPrefix: avatarPrefixForUser(userId) },
      );
    },

    async confirmAvatar(userId, objectKey) {
      const prefix = `${avatarPrefixForUser(userId)}/`;
      if (!objectKey.startsWith(prefix)) {
        throw new UserProfileServiceError("Avatar upload does not belong to this user.", 400);
      }
      if (!options.storageProvider.readObject) {
        throw new UserProfileServiceError("Avatar reads are not available.", 501);
      }
      const object = await options.storageProvider.readObject(objectKey);
      if (!object) {
        throw new UserProfileServiceError("Uploaded avatar was not found.", 404);
      }
      const contentType = object.contentType?.split(";")[0]?.trim();
      if (!contentType || !ALLOWED_AVATAR_TYPES.has(contentType)) {
        throw new UserProfileServiceError("Avatar must be JPEG, PNG, or WebP.", 400);
      }
      if (object.contentLength !== undefined && object.contentLength > MAX_AVATAR_BYTES) {
        throw new UserProfileServiceError("Avatar is too large.", 413);
      }
      await options.repository.setAvatarObjectKey(userId, objectKey, now());
    },

    async clearAvatar(userId) {
      await options.repository.setAvatarObjectKey(userId, null, now());
    },

    async getAvatarObject(userId) {
      if (!options.storageProvider.readObject) {
        throw new UserProfileServiceError("Avatar reads are not available.", 501);
      }
      const profile = await options.repository.getProfile(userId);
      if (!profile.avatarObjectKey) {
        return null;
      }
      return options.storageProvider.readObject(profile.avatarObjectKey);
    },
  };
}

export { UserProfileServiceError, createUserProfileService };
export type {
  StoredUserProfile,
  UserProfileRepository,
  UserProfileService,
};
