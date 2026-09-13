import type {
  StoryReviewItem,
  StoryReviewPatch,
} from "@ruoshui/shared";

interface StoryReviewMediaRef {
  id: string;
  mimeType: string;
  objectKey: string;
}

interface StoryReviewRepository {
  approveRevision(revisionId: string, now: Date): Promise<StoryReviewItem | null>;
  getReviewItem(revisionId: string): Promise<StoryReviewItem | null>;
  getReviewMediaRef(
    revisionId: string,
    mediaAssetId: string,
  ): Promise<StoryReviewMediaRef | null>;
  listPendingReviews(): Promise<StoryReviewItem[]>;
  patchPendingRevision(
    revisionId: string,
    input: StoryReviewPatch,
    now: Date,
  ): Promise<StoryReviewItem | null>;
  rejectRevision(
    revisionId: string,
    note: string | undefined,
    now: Date,
  ): Promise<StoryReviewItem | null>;
  requestChanges(
    revisionId: string,
    note: string,
    now: Date,
  ): Promise<StoryReviewItem | null>;
}

interface StoryReviewService {
  approveRevision(revisionId: string): Promise<StoryReviewItem>;
  getReviewItem(revisionId: string): Promise<StoryReviewItem>;
  getReviewMediaRef(revisionId: string, mediaAssetId: string): Promise<StoryReviewMediaRef>;
  listPendingReviews(): Promise<StoryReviewItem[]>;
  patchRevision(revisionId: string, input: StoryReviewPatch): Promise<StoryReviewItem>;
  rejectRevision(revisionId: string, note?: string): Promise<StoryReviewItem>;
  requestChanges(revisionId: string, note: string): Promise<StoryReviewItem>;
}

class StoryReviewServiceError extends Error {
  readonly status: 404 | 409;

  constructor(message: string, status: 404 | 409) {
    super(message);
    this.name = "StoryReviewServiceError";
    this.status = status;
  }
}

interface CreateStoryReviewServiceOptions {
  now?: () => Date;
  repository: StoryReviewRepository;
}

function createStoryReviewService(
  options: CreateStoryReviewServiceOptions,
): StoryReviewService {
  const now = options.now ?? (() => new Date());

  async function requireReviewItem(revisionId: string): Promise<StoryReviewItem> {
    const item = await options.repository.getReviewItem(revisionId);
    if (!item) {
      throw new StoryReviewServiceError("Story revision not found.", 404);
    }
    return item;
  }

  async function requirePending(revisionId: string): Promise<StoryReviewItem> {
    const item = await requireReviewItem(revisionId);
    if (item.revision.status !== "pending_review") {
      throw new StoryReviewServiceError(
        "Only a pending Story revision can be reviewed.",
        409,
      );
    }
    return item;
  }

  return {
    async approveRevision(revisionId) {
      await requirePending(revisionId);
      const result = await options.repository.approveRevision(revisionId, now());
      if (!result) {
        throw new StoryReviewServiceError(
          "Story revision changed before it could be approved.",
          409,
        );
      }
      return result;
    },

    async getReviewItem(revisionId) {
      return requireReviewItem(revisionId);
    },

    async getReviewMediaRef(revisionId, mediaAssetId) {
      await requireReviewItem(revisionId);
      const media = await options.repository.getReviewMediaRef(revisionId, mediaAssetId);
      if (!media) {
        throw new StoryReviewServiceError("Story review media not found.", 404);
      }
      return media;
    },

    async listPendingReviews() {
      return options.repository.listPendingReviews();
    },

    async patchRevision(revisionId, input) {
      await requirePending(revisionId);
      const result = await options.repository.patchPendingRevision(
        revisionId,
        input,
        now(),
      );
      if (!result) {
        throw new StoryReviewServiceError(
          "Story revision changed before the correction could be saved.",
          409,
        );
      }
      return result;
    },

    async rejectRevision(revisionId, note) {
      await requirePending(revisionId);
      const result = await options.repository.rejectRevision(
        revisionId,
        note,
        now(),
      );
      if (!result) {
        throw new StoryReviewServiceError(
          "Story revision changed before it could be rejected.",
          409,
        );
      }
      return result;
    },

    async requestChanges(revisionId, note) {
      await requirePending(revisionId);
      const result = await options.repository.requestChanges(
        revisionId,
        note,
        now(),
      );
      if (!result) {
        throw new StoryReviewServiceError(
          "Story revision changed before changes could be requested.",
          409,
        );
      }
      return result;
    },
  };
}

export { StoryReviewServiceError, createStoryReviewService };
export type {
  CreateStoryReviewServiceOptions,
  StoryReviewMediaRef,
  StoryReviewRepository,
  StoryReviewService,
};
