import type { Story, StoryDraft } from "@ruoshui/shared";

interface StoryAuthorRepository {
  createDraftFromPublished(
    userId: string,
    storyId: string,
    now: Date,
  ): Promise<StoryDraft | "conflict" | null>;
  softDeleteStory(userId: string, storyId: string, now: Date): Promise<Story | null>;
  unpublishStory(userId: string, storyId: string, now: Date): Promise<Story | null>;
}

interface StoryAuthorService {
  createEditDraft(userId: string, storyId: string): Promise<StoryDraft>;
  deleteStory(userId: string, storyId: string): Promise<Story>;
  unpublishStory(userId: string, storyId: string): Promise<Story>;
}

class StoryAuthorServiceError extends Error {
  readonly status: 404 | 409;

  constructor(message: string, status: 404 | 409) {
    super(message);
    this.name = "StoryAuthorServiceError";
    this.status = status;
  }
}

interface CreateStoryAuthorServiceOptions {
  now?: () => Date;
  repository: StoryAuthorRepository;
}

function createStoryAuthorService(
  options: CreateStoryAuthorServiceOptions,
): StoryAuthorService {
  const now = options.now ?? (() => new Date());

  return {
    async createEditDraft(userId, storyId) {
      const draft = await options.repository.createDraftFromPublished(userId, storyId, now());
      if (draft === "conflict") {
        throw new StoryAuthorServiceError(
          "This Story already has a draft or revision waiting for review.",
          409,
        );
      }
      if (!draft) {
        throw new StoryAuthorServiceError("Published Story not found.", 404);
      }
      return draft;
    },

    async unpublishStory(userId, storyId) {
      const story = await options.repository.unpublishStory(userId, storyId, now());
      if (!story) {
        throw new StoryAuthorServiceError("Story not found.", 404);
      }
      return story;
    },

    async deleteStory(userId, storyId) {
      const story = await options.repository.softDeleteStory(userId, storyId, now());
      if (!story) {
        throw new StoryAuthorServiceError("Story not found.", 404);
      }
      return story;
    },
  };
}

export { StoryAuthorServiceError, createStoryAuthorService };
export type { StoryAuthorRepository, StoryAuthorService };
