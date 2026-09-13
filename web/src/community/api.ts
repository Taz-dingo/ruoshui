import type { ForumPostDetail, SceneBootstrap } from '@ruoshui/shared';

interface ApiEnvelope<T> {
  data?: T;
  error?: string;
  ok?: boolean;
}

async function requestForumJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, init);
  let payload: ApiEnvelope<T> | null = null;

  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error ?? `HTTP ${response.status}`);
  }

  if (!payload || !('data' in payload)) {
    throw new Error('Forum API returned an unexpected payload.');
  }

  return payload.data as T;
}

async function fetchPostsForScenePin(sceneId: string, pinId: string) {
  return requestForumJson<ForumPostDetail[]>(
    `/api/forum/scenes/${sceneId}/pins/${pinId}/posts`
  );
}

async function fetchSceneBootstrap(sceneId: string) {
  return requestForumJson<SceneBootstrap>(`/api/forum/scenes/${sceneId}/bootstrap`);
}

export {
  fetchPostsForScenePin,
  fetchSceneBootstrap
};
