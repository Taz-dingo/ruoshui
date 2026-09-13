import type {
  CreateStoryCommentInput,
  StorySocial,
} from "@ruoshui/shared";

interface SocialCommentRef {
  id: string;
  storyId: string;
  authorUserId: string;
  rootCommentId: string | null;
}

interface CreateSocialCommentRecord {
  storyId: string;
  authorUserId: string;
  body: string;
  rootCommentId: string | null;
  replyToCommentId: string | null;
  now: Date;
}

interface StorySocialRepository {
  createComment(input: CreateSocialCommentRecord): Promise<void>;
  getSocial(storyId: string, viewerUserId?: string): Promise<StorySocial>;
  getVisibleComment(commentId: string): Promise<SocialCommentRef | null>;
  isStoryPublished(storyId: string): Promise<boolean>;
  setCommentLike(commentId: string, userId: string, liked: boolean, now: Date): Promise<void>;
  setCommentStatus(
    commentId: string,
    status: "visible" | "hidden" | "deleted",
    now: Date,
  ): Promise<void>;
  setStoryLike(storyId: string, userId: string, liked: boolean, now: Date): Promise<void>;
}

interface StorySocialService {
  createComment(
    storyId: string,
    userId: string,
    input: CreateStoryCommentInput,
  ): Promise<StorySocial>;
  deleteOwnComment(commentId: string, userId: string): Promise<StorySocial>;
  getSocial(storyId: string, viewerUserId?: string): Promise<StorySocial>;
  setCommentLike(commentId: string, userId: string, liked: boolean): Promise<StorySocial>;
  setStoryLike(storyId: string, userId: string, liked: boolean): Promise<StorySocial>;
}

class StorySocialServiceError extends Error {
  readonly status: 400 | 403 | 404;

  constructor(message: string, status: 400 | 403 | 404) {
    super(message);
    this.name = "StorySocialServiceError";
    this.status = status;
  }
}

interface CreateStorySocialServiceOptions {
  now?: () => Date;
  repository: StorySocialRepository;
}

function createStorySocialService(
  options: CreateStorySocialServiceOptions,
): StorySocialService {
  const now = options.now ?? (() => new Date());

  async function requirePublishedStory(storyId: string) {
    if (!(await options.repository.isStoryPublished(storyId))) {
      throw new StorySocialServiceError("Published Story not found.", 404);
    }
  }

  return {
    async getSocial(storyId, viewerUserId) {
      await requirePublishedStory(storyId);
      return options.repository.getSocial(storyId, viewerUserId);
    },

    async createComment(storyId, userId, input) {
      await requirePublishedStory(storyId);

      let rootCommentId: string | null = null;
      let replyToCommentId: string | null = null;
      if (input.replyToCommentId) {
        const target = await options.repository.getVisibleComment(input.replyToCommentId);
        if (!target || target.storyId !== storyId) {
          throw new StorySocialServiceError(
            "Reply target must be a visible comment on the same Story.",
            400,
          );
        }
        rootCommentId = target.rootCommentId ?? target.id;
        replyToCommentId = target.id;
      }

      await options.repository.createComment({
        storyId,
        authorUserId: userId,
        body: input.body,
        rootCommentId,
        replyToCommentId,
        now: now(),
      });
      return options.repository.getSocial(storyId, userId);
    },

    async deleteOwnComment(commentId, userId) {
      const comment = await options.repository.getVisibleComment(commentId);
      if (!comment) {
        throw new StorySocialServiceError("Visible comment not found.", 404);
      }
      if (comment.authorUserId !== userId) {
        throw new StorySocialServiceError("You can only delete your own comment.", 403);
      }
      await requirePublishedStory(comment.storyId);
      await options.repository.setCommentStatus(commentId, "deleted", now());
      return options.repository.getSocial(comment.storyId, userId);
    },

    async setStoryLike(storyId, userId, liked) {
      await requirePublishedStory(storyId);
      await options.repository.setStoryLike(storyId, userId, liked, now());
      return options.repository.getSocial(storyId, userId);
    },

    async setCommentLike(commentId, userId, liked) {
      const comment = await options.repository.getVisibleComment(commentId);
      if (!comment) {
        throw new StorySocialServiceError("Visible comment not found.", 404);
      }
      await requirePublishedStory(comment.storyId);
      await options.repository.setCommentLike(commentId, userId, liked, now());
      return options.repository.getSocial(comment.storyId, userId);
    },
  };
}

export { StorySocialServiceError, createStorySocialService };
export type {
  CreateSocialCommentRecord,
  SocialCommentRef,
  StorySocialRepository,
  StorySocialService,
};
