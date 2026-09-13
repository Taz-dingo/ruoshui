import type { StoryDraft } from '@ruoshui/shared';

interface ApiEnvelope<T> {
  data?: T;
  error?: string;
}

type OwnedStoryPublicState = 'published' | 'unpublished' | 'never_published';
type OwnedStoryWorkState = 'draft' | 'pending_review' | 'changes_requested' | 'rejected';

interface OwnedStoryRevisionSummary {
  id: string;
  state: 'published' | OwnedStoryWorkState;
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

async function requestOwnedData<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
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
    const error = new Error(payload?.error ?? `HTTP ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  if (!payload || !('data' in payload)) {
    throw new Error('若水 API 返回了无法识别的数据。');
  }
  return payload.data as T;
}

async function fetchMyStories(): Promise<OwnedStoryItem[]> {
  return requestOwnedData<OwnedStoryItem[]>('/api/stories/mine');
}

async function fetchOwnedStoryDraft(storyId: string): Promise<StoryDraft> {
  return requestOwnedData<StoryDraft>(`/api/stories/drafts/${encodeURIComponent(storyId)}`);
}

function getOwnedStoryMediaUrl(storyId: string, mediaAssetId: string): string {
  return `/api/stories/${encodeURIComponent(storyId)}/media/${encodeURIComponent(mediaAssetId)}`;
}

export { fetchMyStories, fetchOwnedStoryDraft, getOwnedStoryMediaUrl };
export type {
  OwnedStoryItem,
  OwnedStoryPublicState,
  OwnedStoryRevisionSummary,
  OwnedStoryWorkState,
};
