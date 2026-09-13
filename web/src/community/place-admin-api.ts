import type { CreatePlaceInput, Place, UpdatePlaceInput } from '@ruoshui/shared';

import { ApiRequestError } from './content-api';

interface ApiEnvelope<T> {
  data?: T;
  error?: string;
}

async function requestAdminPlaceData<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
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
    throw new ApiRequestError(response.status, payload?.error ?? `HTTP ${response.status}`);
  }
  if (!payload || !('data' in payload)) {
    throw new Error('若水 API 返回了无法识别的数据。');
  }
  return payload.data as T;
}

async function fetchAdminPlaces(sceneId: string): Promise<Place[]> {
  const query = new URLSearchParams({ sceneId });
  return requestAdminPlaceData<Place[]>(`/api/places/admin?${query.toString()}`);
}

async function createAdminPlace(input: CreatePlaceInput): Promise<Place> {
  return requestAdminPlaceData<Place>('/api/places', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
}

async function updateAdminPlace(placeId: string, input: UpdatePlaceInput): Promise<Place> {
  return requestAdminPlaceData<Place>(`/api/places/${encodeURIComponent(placeId)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export { createAdminPlace, fetchAdminPlaces, updateAdminPlace };
