import type {
  UpdateUserProfileDetailsInput,
  UploadTicket,
  UserProfile,
} from '@ruoshui/shared';

interface ApiEnvelope<T> {
  data?: T;
  error?: string;
  ok?: boolean;
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

async function fetchUserProfile(): Promise<UserProfile> {
  return requestData<UserProfile>('/api/users/me/profile');
}

async function updateUserProfileDetails(input: UpdateUserProfileDetailsInput): Promise<UserProfile> {
  return requestData<UserProfile>('/api/users/me/profile', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
}

async function requestProfileAvatarUpload(file: File): Promise<UploadTicket> {
  return requestData<UploadTicket>('/api/users/me/avatar/upload-request', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    }),
  });
}

async function uploadProfileAvatar(ticket: UploadTicket, file: File): Promise<UserProfile> {
  if (!ticket.uploadUrl) {
    throw new Error('头像上传服务没有返回可用地址。');
  }
  const headers = new Headers(ticket.headers);
  if (!headers.has('content-type')) {
    headers.set('content-type', file.type || 'application/octet-stream');
  }
  const uploadResponse = await fetch(ticket.uploadUrl, {
    method: ticket.method,
    headers,
    body: file,
  });
  if (!uploadResponse.ok) {
    const payload = await readJson<{ error?: string }>(uploadResponse);
    throw new Error(payload?.error ?? `头像上传失败（HTTP ${uploadResponse.status}）。`);
  }
  return requestData<UserProfile>('/api/users/me/avatar', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ objectKey: ticket.objectKey }),
  });
}

async function clearProfileAvatar(): Promise<void> {
  const response = await fetch('/api/users/me/avatar', {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  const payload = await readJson<ApiEnvelope<never>>(response);
  if (!response.ok) {
    throw new Error(payload?.error ?? `HTTP ${response.status}`);
  }
}

export {
  clearProfileAvatar,
  fetchUserProfile,
  requestProfileAvatarUpload,
  updateUserProfileDetails,
  uploadProfileAvatar,
};
