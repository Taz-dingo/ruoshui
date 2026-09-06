import type {
  EmailChangeProofResult,
  EmailChangeStatus,
  User,
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

async function fetchEmailChangeStatus(): Promise<EmailChangeStatus> {
  return requestData<EmailChangeStatus>('/api/auth/email/change');
}

async function requestCurrentEmailChangeOtp(): Promise<EmailChangeStatus> {
  return requestData<EmailChangeStatus>('/api/auth/email/change/current/request-otp', {
    method: 'POST',
  });
}

async function verifyCurrentEmailChangeOtp(code: string): Promise<EmailChangeProofResult> {
  return requestData<EmailChangeProofResult>('/api/auth/email/change/current/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code }),
  });
}

async function requestNewEmailChangeOtp(email: string, proof: string): Promise<void> {
  const response = await fetch('/api/auth/email/change/new/request-otp', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, proof }),
  });
  const payload = await readJson<ApiEnvelope<never>>(response);
  if (!response.ok) {
    throw new Error(payload?.error ?? `HTTP ${response.status}`);
  }
}

async function verifyNewEmailChangeOtp(
  email: string,
  code: string,
  proof: string,
): Promise<{ email: string; user: User }> {
  return requestData<{ email: string; user: User }>('/api/auth/email/change/new/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, code, proof }),
  });
}

export {
  fetchEmailChangeStatus,
  requestCurrentEmailChangeOtp,
  requestNewEmailChangeOtp,
  verifyCurrentEmailChangeOtp,
  verifyNewEmailChangeOtp,
};
