interface ModerationCommentAuthor {
  id: string;
  displayName: string | null;
}

type ModerationCommentStatus = "visible" | "hidden" | "deleted";

interface CommentModerationItem {
  id: string;
  storyId: string;
  storyTitle: string | null;
  author: ModerationCommentAuthor;
  rootCommentId: string | null;
  replyToCommentId: string | null;
  body: string;
  status: ModerationCommentStatus;
  createdAt: string;
  updatedAt: string;
}

interface CommentModerationRepository {
  listComments(limit: number): Promise<CommentModerationItem[]>;
  setCommentStatus(
    commentId: string,
    status: "visible" | "hidden",
    now: Date,
  ): Promise<CommentModerationItem | null>;
}

interface CommentModerationService {
  hideComment(commentId: string): Promise<CommentModerationItem>;
  listComments(limit?: number): Promise<CommentModerationItem[]>;
  restoreComment(commentId: string): Promise<CommentModerationItem>;
}

class CommentModerationServiceError extends Error {
  readonly status: 404 | 409;

  constructor(message: string, status: 404 | 409) {
    super(message);
    this.name = "CommentModerationServiceError";
    this.status = status;
  }
}

interface CreateCommentModerationServiceOptions {
  now?: () => Date;
  repository: CommentModerationRepository;
}

function createCommentModerationService(
  options: CreateCommentModerationServiceOptions,
): CommentModerationService {
  const now = options.now ?? (() => new Date());

  async function setStatus(
    commentId: string,
    status: "visible" | "hidden",
  ): Promise<CommentModerationItem> {
    const item = await options.repository.setCommentStatus(commentId, status, now());
    if (!item) {
      throw new CommentModerationServiceError(
        "Comment not found or it was deleted by its author.",
        404,
      );
    }
    return item;
  }

  return {
    async listComments(limit = 100) {
      return options.repository.listComments(Math.min(Math.max(limit, 1), 200));
    },
    async hideComment(commentId) {
      return setStatus(commentId, "hidden");
    },
    async restoreComment(commentId) {
      return setStatus(commentId, "visible");
    },
  };
}

export { CommentModerationServiceError, createCommentModerationService };
export type {
  CommentModerationItem,
  CommentModerationRepository,
  CommentModerationService,
  ModerationCommentStatus,
};
