import type { Story, StoryDraft } from '@ruoshui/shared';

import { ApiRequestError } from './content-api';

interface ApiEnvelope<T> {
  data?: T;
  error?: string;
}

async function requestAuthorData<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...init,
  });
  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new ApiRequestError(response.status, payload?.error ?? `HTTP ${response.status}`);
  }
  if (!payload || !('data' in payload)) {
    throw new Error('若水 API 返回了无法识别的数据。');
  }
  return payload.data as T;
}

async function createPublishedStoryEditDraft(storyId: string): Promise<StoryDraft> {
  return requestAuthorData<StoryDraft>(`/api/stories/${encodeURIComponent(storyId)}/edit`, {
    method: 'POST',
  });
}

async function unpublishOwnedStory(storyId: string): Promise<Story> {
  return requestAuthorData<Story>(`/api/stories/${encodeURIComponent(storyId)}/unpublish`, {
    method: 'POST',
  });
}

async function deleteOwnedStory(storyId: string): Promise<Story> {
  return requestAuthorData<Story>(`/api/stories/${encodeURIComponent(storyId)}`, {
    method: 'DELETE',
  });
}

export {
  createPublishedStoryEditDraft,
  deleteOwnedStory,
  unpublishOwnedStory,
};
