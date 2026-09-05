import type {
  ConfirmMediaAssetInput,
  CreateStoryDraftInput,
  Place,
  PublishedStory,
  StoryDraft,
  StoryDraftPatch,
  StoryReviewItem,
  StoryReviewPatch,
  UploadRequest,
  UploadTicket,
  User,
} from '@ruoshui/shared';

interface ApiEnvelope<T> {
  data?: T;
  error?: string;
  ok?: boolean;
}

interface AuthEnvelope {
  error?: string;
  ok?: boolean;
  user?: User | null;
}

class ApiRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function requestData<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: 'same-origin',
    ...init,
  });
  const payload = await readJson<ApiEnvelope<T>>(response);

  if (!response.ok) {
    throw new ApiRequestError(response.status, payload?.error ?? `HTTP ${response.status}`);
  }
  if (!payload || !('data' in payload)) {
    throw new Error('若水 API 返回了无法识别的数据。');
  }
  return payload.data as T;
}

async function requestEmailOtp(email: string): Promise<void> {
  const response = await fetch('/api/auth/email/request-otp', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const payload = await readJson<AuthEnvelope>(response);
  if (!response.ok) {
    throw new Error(payload?.error ?? `HTTP ${response.status}`);
  }
}

async function verifyEmailOtp(email: string, code: string): Promise<User> {
  const response = await fetch('/api/auth/email/verify', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  const payload = await readJson<AuthEnvelope>(response);
  if (!response.ok || !payload?.user) {
    throw new Error(payload?.error ?? '验证码验证失败。');
  }
  return payload.user;
}

async function fetchCurrentUser(): Promise<User | null> {
  const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (response.status === 404 || response.status === 503) {
    return null;
  }
  const payload = await readJson<AuthEnvelope>(response);
  if (!response.ok) {
    throw new Error(payload?.error ?? `HTTP ${response.status}`);
  }
  return payload?.user ?? null;
}

async function updateDisplayName(displayName: string | null): Promise<User> {
  const response = await fetch('/api/auth/profile', {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });
  const payload = await readJson<AuthEnvelope>(response);
  if (!response.ok || !payload?.user) {
    throw new Error(payload?.error ?? '名称保存失败。');
  }
  return payload.user;
}

async function fetchPlaces(sceneId: string): Promise<Place[]> {
  const query = new URLSearchParams({ sceneId });
  return requestData<Place[]>(`/api/places?${query.toString()}`);
}

async function fetchPublishedStories(input: {
  placeId?: string;
  limit?: number;
} = {}): Promise<PublishedStory[]> {
  const query = new URLSearchParams();
  if (input.placeId) query.set('placeId', input.placeId);
  if (input.limit) query.set('limit', String(input.limit));
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return requestData<PublishedStory[]>(`/api/published-stories${suffix}`);
}

async function fetchPublishedStory(storyId: string): Promise<PublishedStory> {
  return requestData<PublishedStory>(
    `/api/published-stories/${encodeURIComponent(storyId)}`,
  );
}

function getPublishedStoryMediaUrl(storyId: string, mediaAssetId: string): string {
  return `/api/published-stories/${encodeURIComponent(storyId)}/media/${encodeURIComponent(mediaAssetId)}`;
}

async function fetchStoryDrafts(): Promise<StoryDraft[]> {
  return requestData<StoryDraft[]>('/api/stories/drafts');
}

async function createStoryDraft(input: CreateStoryDraftInput): Promise<StoryDraft> {
  return requestData<StoryDraft>('/api/stories/drafts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
}

async function updateStoryDraft(storyId: string, input: StoryDraftPatch): Promise<StoryDraft> {
  return requestData<StoryDraft>(`/api/stories/drafts/${storyId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
}

async function submitStoryDraft(storyId: string): Promise<StoryDraft> {
  return requestData<StoryDraft>(`/api/stories/drafts/${storyId}/submit`, {
    method: 'POST',
  });
}

async function requestStoryUploadTicket(input: UploadRequest): Promise<UploadTicket> {
  return requestData<UploadTicket>('/api/stories/media/upload-requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
}

async function uploadFileWithTicket(ticket: UploadTicket, file: File): Promise<void> {
  if (!ticket.uploadUrl) {
    throw new Error('上传服务没有返回可用地址。');
  }

  const headers = new Headers(ticket.headers);
  if (!headers.has('content-type')) {
    headers.set('content-type', file.type || 'application/octet-stream');
  }
  const response = await fetch(ticket.uploadUrl, {
    method: ticket.method,
    headers,
    body: file,
  });
  if (!response.ok) {
    const payload = await readJson<{ error?: string }>(response);
    throw new Error(payload?.error ?? `照片上传失败（HTTP ${response.status}）。`);
  }
}

async function confirmStoryMedia(input: ConfirmMediaAssetInput): Promise<string> {
  const result = await requestData<{ id: string }>('/api/stories/media/confirm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return result.id;
}

async function fetchStoryReviewQueue(): Promise<StoryReviewItem[]> {
  return requestData<StoryReviewItem[]>('/api/admin/story-reviews');
}

async function fetchStoryReviewItem(revisionId: string): Promise<StoryReviewItem> {
  return requestData<StoryReviewItem>(
    `/api/admin/story-reviews/${encodeURIComponent(revisionId)}`,
  );
}

async function patchStoryReview(
  revisionId: string,
  input: StoryReviewPatch,
): Promise<StoryReviewItem> {
  return requestData<StoryReviewItem>(
    `/api/admin/story-reviews/${encodeURIComponent(revisionId)}`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
}

async function approveStoryReview(revisionId: string): Promise<StoryReviewItem> {
  return requestData<StoryReviewItem>(
    `/api/admin/story-reviews/${encodeURIComponent(revisionId)}/approve`,
    { method: 'POST' },
  );
}

async function requestStoryReviewChanges(
  revisionId: string,
  note: string,
): Promise<StoryReviewItem> {
  return requestData<StoryReviewItem>(
    `/api/admin/story-reviews/${encodeURIComponent(revisionId)}/request-changes`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ note }),
    },
  );
}

async function rejectStoryReview(
  revisionId: string,
  note?: string,
): Promise<StoryReviewItem> {
  return requestData<StoryReviewItem>(
    `/api/admin/story-reviews/${encodeURIComponent(revisionId)}/reject`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(note?.trim() ? { note: note.trim() } : {}),
    },
  );
}

function getStoryReviewMediaUrl(revisionId: string, mediaAssetId: string): string {
  return `/api/admin/story-reviews/${encodeURIComponent(revisionId)}/media/${encodeURIComponent(mediaAssetId)}`;
}

export {
  ApiRequestError,
  approveStoryReview,
  confirmStoryMedia,
  createStoryDraft,
  fetchCurrentUser,
  fetchPlaces,
  fetchPublishedStories,
  fetchPublishedStory,
  fetchStoryDrafts,
  fetchStoryReviewItem,
  fetchStoryReviewQueue,
  getPublishedStoryMediaUrl,
  getStoryReviewMediaUrl,
  patchStoryReview,
  rejectStoryReview,
  requestEmailOtp,
  requestStoryReviewChanges,
  requestStoryUploadTicket,
  submitStoryDraft,
  updateDisplayName,
  updateStoryDraft,
  uploadFileWithTicket,
  verifyEmailOtp,
};
