import type {
  ForumPostDetail,
  ListForumPostsInput,
  SceneBootstrap,
  ScenePin,
} from "@ruoshui/shared";

interface ForumRepository {
  checkConnection(): Promise<void>;
  getSceneBootstrap(sceneId: string): Promise<SceneBootstrap>;
  listForumPosts(input: ListForumPostsInput): Promise<ForumPostDetail[]>;
  getForumPostDetail(postId: string): Promise<ForumPostDetail | null>;
  listPostsForScenePin(sceneId: string, pinId: string): Promise<ForumPostDetail[]>;
  listPinsForPost(postId: string): Promise<ScenePin[]>;
}

export type { ForumRepository };
