import type {
  ConfirmMediaAssetInput,
  CreateForumPostInput,
  CreateScenePinInput,
  ForumPost,
  ForumPostDetail,
  ListForumPostsInput,
  MediaAsset,
  Scene,
  SceneBootstrap,
  ScenePin,
  UpsertSceneInput,
} from "@ruoshui/shared";

interface ForumRepository {
  checkConnection(): Promise<void>;
  upsertScene(input: UpsertSceneInput): Promise<Scene>;
  createForumPost(input: CreateForumPostInput): Promise<ForumPost>;
  createScenePin(input: CreateScenePinInput): Promise<ScenePin>;
  confirmMediaAsset(input: ConfirmMediaAssetInput): Promise<MediaAsset>;
  getSceneBootstrap(sceneId: string): Promise<SceneBootstrap>;
  listForumPosts(input: ListForumPostsInput): Promise<ForumPostDetail[]>;
  getForumPostDetail(postId: string): Promise<ForumPostDetail | null>;
  listPostsForScenePin(sceneId: string, pinId: string): Promise<ForumPostDetail[]>;
  listPinsForPost(postId: string): Promise<ScenePin[]>;
}

export type { ForumRepository };
