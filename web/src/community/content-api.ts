import type {
  ConfirmMediaAssetInput,
  CreateStoryDraftInput,
  Place,
  StoryDraft,
  StoryDraftPatch,
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
    throw new Error(payload?.error ?? `HTTP ${response.status}`);
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

export {
  confirmStoryMedia,
  createStoryDraft,
  fetchCurrentUser,
  fetchPlaces,
  fetchStoryDrafts,
  requestEmailOtp,
  requestStoryUploadTicket,
  submitStoryDraft,
  updateDisplayName,
  updateStoryDraft,
  uploadFileWithTicket,
  verifyEmailOtp,
};
