export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const response = await fetch(path, { ...init, headers, credentials: 'include' });
  if (response.status === 204 || response.status === 304) return undefined as T;
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as { detail?: string; message?: string; code?: string }) : null;
  if (!response.ok) {
    throw new ApiError(response.status, payload?.detail || payload?.message || response.statusText, payload?.code);
  }
  return payload as T;
}

export async function signIn(email: string, password: string): Promise<void> {
  const response = await fetch('/api/auth/sign-in/email', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string; detail?: string } | null;
    throw new ApiError(response.status, payload?.detail || payload?.message || '登录失败');
  }
}

export async function signOut(): Promise<void> {
  await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' });
}
