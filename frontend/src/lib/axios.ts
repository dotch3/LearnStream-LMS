import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// Module-level token store (in-memory, survives re-renders but not page refresh)
let accessToken: string | null = null;
let expiresAt: number | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAuthTokens(token: string, exp: number) {
  accessToken = token;
  expiresAt = exp;
}

export function clearAuthTokens() {
  accessToken = null;
  expiresAt = null;
}

export const api = axios.create({ baseURL: BASE_URL });

async function doRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const storedRefresh =
      typeof localStorage !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    if (!storedRefresh) return null;
    try {
      const res = await axios.post<{ accessToken: string; refreshToken: string }>(
        `${BASE_URL}/auth/refresh`,
        { refreshToken: storedRefresh },
      );
      accessToken = res.data.accessToken;
      expiresAt = Date.now() + 14 * 60 * 1000;
      localStorage.setItem('refreshToken', res.data.refreshToken);
      return accessToken;
    } catch {
      accessToken = null;
      expiresAt = null;
      localStorage.removeItem('refreshToken');
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Request interceptor: restore session on page refresh + silent renewal near expiry
api.interceptors.request.use(async (config) => {
  const now = Date.now();

  // No token in memory but refresh token exists → restore session (page refresh case)
  const hasRefreshToken =
    typeof localStorage !== 'undefined' && !!localStorage.getItem('refreshToken');
  const tokenMissing = accessToken === null && hasRefreshToken;

  // Token about to expire → proactive renewal
  const tokenExpiring = expiresAt !== null && expiresAt - now < 60_000;

  if (tokenMissing || tokenExpiring) {
    const newToken = await doRefresh();
    if (newToken) accessToken = newToken;
  }

  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return config;
});

// Response interceptor: redirect to login on 401/403
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (typeof window !== 'undefined') {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
