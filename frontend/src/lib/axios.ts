import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// Module-level token store (in-memory, survives re-renders but not page refresh)
let accessToken: string | null = null;
let expiresAt: number | null = null;

export function setAuthTokens(token: string, exp: number) {
  accessToken = token;
  expiresAt = exp;
}

export function clearAuthTokens() {
  accessToken = null;
  expiresAt = null;
}

export const api = axios.create({ baseURL: BASE_URL });

// Request interceptor: attach Bearer token + silent refresh if near expiry
api.interceptors.request.use(async (config) => {
  const now = Date.now();
  const needsRefresh = expiresAt !== null && expiresAt - now < 60_000;

  if (needsRefresh) {
    const storedRefresh = localStorage.getItem('refreshToken');
    if (storedRefresh) {
      try {
        const res = await axios.post<{ accessToken: string; refreshToken: string }>(
          `${BASE_URL}/auth/refresh`,
          { refreshToken: storedRefresh },
        );
        accessToken = res.data.accessToken;
        expiresAt = Date.now() + 14 * 60 * 1000;
        localStorage.setItem('refreshToken', res.data.refreshToken);
      } catch {
        accessToken = null;
        expiresAt = null;
        localStorage.removeItem('refreshToken');
      }
    }
  }

  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return config;
});
