import type {
  ListPublishedStoriesInput,
  MediaDerivativeVariant,
  PublishedStory,
} from "@ruoshui/shared";

interface PublishedStoryMediaRef {
  id: string;
  mimeType: string;
  objectKey: string;
}

interface StoryReadRepository {
  getPublishedStory(storyId: string): Promise<PublishedStory | null>;
  getPublishedStoryMediaRef(
    storyId: string,
    mediaAssetId: string,
  ): Promise<PublishedStoryMediaRef | null>;
  getPublishedStoryMediaDerivativeRef(
    storyId: string,
    mediaAssetId: string,
    variant: MediaDerivativeVariant,
  ): Promise<PublishedStoryMediaRef | null>;
  listPublishedStories(input: ListPublishedStoriesInput): Promise<PublishedStory[]>;
}

interface StoryReadService {
  getPublishedStory(storyId: string): Promise<PublishedStory>;
  getPublishedStoryMediaRef(
    storyId: string,
    mediaAssetId: string,
  ): Promise<PublishedStoryMediaRef>;
  getPublishedStoryMediaDerivativeRef(
    storyId: string,
    mediaAssetId: string,
    variant: MediaDerivativeVariant,
  ): Promise<PublishedStoryMediaRef>;
  listPublishedStories(input: ListPublishedStoriesInput): Promise<PublishedStory[]>;
}

class StoryReadServiceError extends Error {
  readonly status: 404;

  constructor(message: string) {
    super(message);
    this.name = "StoryReadServiceError";
    this.status = 404;
  }
}

function createStoryReadService(repository: StoryReadRepository): StoryReadService {
  return {
    async getPublishedStory(storyId) {
      const story = await repository.getPublishedStory(storyId);
      if (!story) {
        throw new StoryReadServiceError("Published Story not found.");
      }
      return story;
    },

    async getPublishedStoryMediaRef(storyId, mediaAssetId) {
      const media = await repository.getPublishedStoryMediaRef(storyId, mediaAssetId);
      if (!media) {
        throw new StoryReadServiceError("Published Story media not found.");
      }
      return media;
    },

    async getPublishedStoryMediaDerivativeRef(storyId, mediaAssetId, variant) {
      const media = await repository.getPublishedStoryMediaDerivativeRef(
        storyId,
        mediaAssetId,
        variant,
      );
      if (!media) {
        throw new StoryReadServiceError("Published Story media derivative not found.");
      }
      return media;
    },

    async listPublishedStories(input) {
      return repository.listPublishedStories(input);
    },
  };
}

export { StoryReadServiceError, createStoryReadService };
export type {
  PublishedStoryMediaRef,
  StoryReadRepository,
  StoryReadService,
};