import {
  submitStoryRevisionInputSchema,
  type CreateStoryDraftInput,
  type StoryDraft,
  type StoryDraftPatch,
} from "@ruoshui/shared";

interface StoryRepository {
  areMediaAssetsReady(mediaAssetIds: string[]): Promise<boolean>;
  createDraft(userId: string, input: CreateStoryDraftInput, now: Date): Promise<StoryDraft>;
  getDraft(userId: string, storyId: string): Promise<StoryDraft | null>;
  listDrafts(userId: string): Promise<StoryDraft[]>;
  markDraftPendingReview(
    userId: string,
    storyId: string,
    revisionId: string,
    now: Date,
  ): Promise<StoryDraft | null>;
  updateDraft(
    userId: string,
    storyId: string,
    input: StoryDraftPatch,
    now: Date,
  ): Promise<StoryDraft | null>;
}

interface StoryService {
  createDraft(userId: string, input: CreateStoryDraftInput): Promise<StoryDraft>;
  getDraft(userId: string, storyId: string): Promise<StoryDraft>;
  listDrafts(userId: string): Promise<StoryDraft[]>;
  submitDraft(userId: string, storyId: string): Promise<StoryDraft>;
  updateDraft(userId: string, storyId: string, input: StoryDraftPatch): Promise<StoryDraft>;
}

class StoryServiceError extends Error {
  readonly status: 404 | 409;

  constructor(message: string, status: 404 | 409) {
    super(message);
    this.name = "StoryServiceError";
    this.status = status;
  }
}

interface CreateStoryServiceOptions {
  now?: () => Date;
  repository: StoryRepository;
}

function createStoryService(options: CreateStoryServiceOptions): StoryService {
  const now = options.now ?? (() => new Date());

  async function requireDraft(userId: string, storyId: string): Promise<StoryDraft> {
    const draft = await options.repository.getDraft(userId, storyId);
    if (!draft) {
      throw new StoryServiceError("Story draft not found.", 404);
    }
    return draft;
  }

  return {
    async createDraft(userId, input) {
      return options.repository.createDraft(userId, input, now());
    },

    async getDraft(userId, storyId) {
      return requireDraft(userId, storyId);
    },

    async listDrafts(userId) {
      return options.repository.listDrafts(userId);
    },

    async updateDraft(userId, storyId, input) {
      await requireDraft(userId, storyId);
      const updated = await options.repository.updateDraft(userId, storyId, input, now());
      if (!updated) {
        throw new StoryServiceError("Story draft changed while it was being edited.", 409);
      }
      return updated;
    },

    async submitDraft(userId, storyId) {
      const draft = await requireDraft(userId, storyId);
      submitStoryRevisionInputSchema.parse({
        title: draft.revision.title,
        body: draft.revision.body,
        memoryTime: draft.revision.memoryTime,
        mediaAssetIds: draft.revision.mediaAssetIds,
        location: draft.revision.location,
      });

      if (!(await options.repository.areMediaAssetsReady(draft.revision.mediaAssetIds))) {
        throw new StoryServiceError("One or more photos are still uploading or unavailable.", 409);
      }

      const submitted = await options.repository.markDraftPendingReview(
        userId,
        storyId,
        draft.revision.id,
        now(),
      );
      if (!submitted) {
        throw new StoryServiceError("Story draft changed before it could be submitted.", 409);
      }
      return submitted;
    },
  };
}

export { StoryServiceError, createStoryService };
export type { CreateStoryServiceOptions, StoryRepository, StoryService };
