type OwnedStoryPublicState = "published" | "unpublished" | "never_published";
type OwnedStoryWorkState = "draft" | "pending_review" | "changes_requested" | "rejected";

interface OwnedStoryRevisionSummary {
  id: string;
  state: "published" | OwnedStoryWorkState;
  title: string | null;
  bodyPreview: string | null;
  memoryTime: string | null;
  mediaCount: number;
  moderationNote: string | null;
  updatedAt: string;
}

interface OwnedStoryItem {
  id: string;
  publicState: OwnedStoryPublicState;
  publishedRevision: OwnedStoryRevisionSummary | null;
  workingRevision: OwnedStoryRevisionSummary | null;
  createdAt: string;
  updatedAt: string;
}

interface OwnedStoryMediaRef {
  id: string;
  mimeType: string;
  objectKey: string;
}

interface StoryOwnerReadRepository {
  getOwnedStoryMediaRef(
    userId: string,
    storyId: string,
    mediaAssetId: string,
  ): Promise<OwnedStoryMediaRef | null>;
  listOwnedStories(userId: string): Promise<OwnedStoryItem[]>;
}

interface StoryOwnerReadService {
  getOwnedStoryMediaRef(
    userId: string,
    storyId: string,
    mediaAssetId: string,
  ): Promise<OwnedStoryMediaRef | null>;
  listOwnedStories(userId: string): Promise<OwnedStoryItem[]>;
}

function createStoryOwnerReadService(
  repository: StoryOwnerReadRepository,
): StoryOwnerReadService {
  return {
    async getOwnedStoryMediaRef(userId, storyId, mediaAssetId) {
      return repository.getOwnedStoryMediaRef(userId, storyId, mediaAssetId);
    },
    async listOwnedStories(userId) {
      return repository.listOwnedStories(userId);
    },
  };
}

export { createStoryOwnerReadService };
export type {
  OwnedStoryItem,
  OwnedStoryMediaRef,
  OwnedStoryPublicState,
  OwnedStoryRevisionSummary,
  OwnedStoryWorkState,
  StoryOwnerReadRepository,
  StoryOwnerReadService,
};
