import type { ApiResponse } from './types';

export const API_BASE = '/app/api/v1';

const REFRESH_PATH = (import.meta as ImportMeta & { env: Record<string, string> }).env?.VITE_API_REFRESH_PATH ?? '/auth/token';
const CACHE_DURATION = 5 * 60 * 1000; // 5分

// ── トークン管理 ──────────────────────────────────────────────

const getRefreshToken = (): string | null => localStorage.getItem('token');

const getAccessToken = (): string | null => sessionStorage.getItem('access_token');

const setAccessToken = (token: string): void => {
  sessionStorage.setItem('access_token', token);
  sessionStorage.setItem('access_token_timestamp', String(Date.now()));
};

const clearTokens = (): void => {
  localStorage.removeItem('token');
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('access_token_timestamp');
};

const isAccessTokenFresh = (): boolean => {
  const ts = parseInt(sessionStorage.getItem('access_token_timestamp') ?? '0', 10);
  return !!getAccessToken() && Date.now() - ts < CACHE_DURATION;
};

// リフレッシュ中の重複呼び出し防止
let refreshPromise: Promise<void> | null = null;

/** リフレッシュトークンでアクセストークンを取得・キャッシュする */
async function refreshAccessToken(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('no_refresh_token');
  }

  const res = await fetch(REFRESH_PATH, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: refreshToken,
    },
  });

  if (!res.ok) {
    throw new Error(`refresh_failed:${res.status}`);
  }

  const data = await res.json();
  if (data?.token) {
    setAccessToken(data.token);
  } else {
    throw new Error('refresh_no_token');
  }
}

/** アクセストークンを取得（必要に応じてリフレッシュ） */
async function ensureAccessToken(): Promise<string | null> {
  if (isAccessTokenFresh()) {
    return getAccessToken();
  }

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  try {
    await refreshPromise;
  } catch {
    // リフレッシュ失敗 → トークンなしで続行（401ハンドラが処理）
  }

  return getAccessToken();
}

// ── 認証状態チェック（起動時用） ──────────────────────────────

/** リフレッシュトークンが存在してアクセストークンが取得できるか確認する */
export async function checkAuth(): Promise<boolean> {
  if (!getRefreshToken()) return false;
  try {
    await refreshAccessToken();
    return true;
  } catch {
    return false;
  }
}

/** ログアウト：トークンをクリアして /auth/login へ */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    // ベストエフォートでサーバー側ログアウト
    fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: refreshToken },
    }).catch(() => {});
  }
  clearTokens();
  window.location.href = '/auth/login';
}

// ── エラークラス ──────────────────────────────────────────────

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'ApiError';
  }
}

// ── fetch ラッパー ────────────────────────────────────────────

async function buildHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = await ensureAccessToken();
  if (token) {
    headers['Authorization'] = token;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    clearTokens();
    window.location.href = '/auth/login';
    throw new ApiError('UNAUTHORIZED', 'Unauthorized', 401);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const json: ApiResponse<T> = await res.json();

  if (!res.ok || json.error) {
    const err = json.error ?? { code: 'UNKNOWN', message: `HTTP ${res.status}` };
    throw new ApiError(err.code, err.message, res.status);
  }

  return json.data;
}

export async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: await buildHeaders(),
  });
  return handleResponse<T>(res);
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: await buildHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function put<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    credentials: 'include',
    headers: await buildHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function del<T = void>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: await buildHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}
