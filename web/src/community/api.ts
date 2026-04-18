import type {
  ConfirmMediaAssetInput,
  CreateForumPostInput,
  ForumPostDetail,
  MediaAsset,
  SceneBootstrap,
  ScenePin,
  UpsertSceneInput,
  UploadRequest,
  UploadTicket
} from '@ruoshui/shared';

interface ApiEnvelope<T> {
  data?: T;
  error?: string;
  ok?: boolean;
}

interface ListForumPostsOptions {
  limit?: number;
  pinId?: string;
  sceneId?: string;
  status?: 'draft' | 'published' | 'archived';
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

function createPostsUrl(options: ListForumPostsOptions = {}) {
  const searchParams = new URLSearchParams();

  if (options.limit) {
    searchParams.set('limit', String(options.limit));
  }

  if (options.pinId) {
    searchParams.set('pinId', options.pinId);
  }

  if (options.sceneId) {
    searchParams.set('sceneId', options.sceneId);
  }

  if (options.status) {
    searchParams.set('status', options.status);
  }

  const search = searchParams.toString();
  return search ? `/api/forum/posts?${search}` : '/api/forum/posts';
}

async function ensureCommunityScene(sceneId: string, input: UpsertSceneInput) {
  return requestForumJson(`/api/forum/scenes/${sceneId}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(input)
  });
}

async function fetchForumPosts(options: ListForumPostsOptions = {}) {
  return requestForumJson<ForumPostDetail[]>(createPostsUrl(options));
}

async function fetchForumPostDetail(postId: string) {
  return requestForumJson<ForumPostDetail>(`/api/forum/posts/${postId}`);
}

async function fetchPostsForScenePin(sceneId: string, pinId: string) {
  return requestForumJson<ForumPostDetail[]>(
    `/api/forum/scenes/${sceneId}/pins/${pinId}/posts`
  );
}

async function fetchPinsForPost(postId: string) {
  return requestForumJson<ScenePin[]>(`/api/forum/posts/${postId}/pins`);
}

async function fetchSceneBootstrap(sceneId: string) {
  return requestForumJson<SceneBootstrap>(`/api/forum/scenes/${sceneId}/bootstrap`);
}

async function createForumPost(input: CreateForumPostInput) {
  return requestForumJson<{ id: string } & Partial<ForumPostDetail>>('/api/forum/posts', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(input)
  });
}

async function requestUploadTicket(input: UploadRequest) {
  return requestForumJson<UploadTicket>('/api/storage/upload-requests', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(input)
  });
}

async function uploadFileWithTicket(ticket: UploadTicket, file: File) {
  if (!ticket.uploadUrl) {
    throw new Error('Upload ticket did not include an upload URL.');
  }

  const headers = new Headers(ticket.headers);
  if (!headers.has('content-type')) {
    headers.set('content-type', file.type || 'application/octet-stream');
  }

  const response = await fetch(ticket.uploadUrl, {
    method: ticket.method,
    headers,
    body: file
  });

  if (!response.ok) {
    let payload: { error?: string } | null = null;

    try {
      payload = (await response.json()) as { error?: string };
    } catch {
      payload = null;
    }

    throw new Error(payload?.error ?? `Upload failed with HTTP ${response.status}`);
  }
}

async function confirmMediaAsset(input: ConfirmMediaAssetInput) {
  return requestForumJson<MediaAsset>(`/api/forum/media/confirm`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(input)
  });
}

export {
  confirmMediaAsset,
  createForumPost,
  ensureCommunityScene,
  fetchForumPostDetail,
  fetchForumPosts,
  fetchPinsForPost,
  fetchPostsForScenePin,
  fetchSceneBootstrap,
  requestUploadTicket,
  uploadFileWithTicket
};
