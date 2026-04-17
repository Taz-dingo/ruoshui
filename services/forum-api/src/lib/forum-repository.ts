import type {
  CreateForumPostInput,
  CreateScenePinInput,
  ForumPost,
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
  getSceneBootstrap(sceneId: string): Promise<SceneBootstrap>;
}

export type { ForumRepository };
