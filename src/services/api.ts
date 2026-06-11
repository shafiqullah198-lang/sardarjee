import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import type { ApiErrorBody, AuthTokens } from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

const REQUEST_TIMEOUT_MS = Number(
  import.meta.env.VITE_API_TIMEOUT_MS ?? 15000,
);

export const TOKEN_STORAGE_KEY = "premium_auth_tokens";
const inflightGetRequests = new Map<string, Promise<unknown>>();
const cachedGetResponses = new Map<string, { expiresAt: number; data: unknown }>();

export function getApiOrigin(): string {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, "");
}

export function resolveMediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const origin = getApiOrigin();
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  if (!cookie) return null;
  return decodeURIComponent(cookie.slice(name.length + 1));
}

function needsCsrfHeader(method: string | undefined): boolean {
  return ["post", "put", "patch", "delete"].includes(
    (method ?? "get").toLowerCase(),
  );
}

export function getStoredTokens(): AuthTokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
}

export function setStoredTokens(tokens: AuthTokens | null): void {
  if (!tokens) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

export class ApiRequestError extends Error {
  status: number;
  data: ApiErrorBody | unknown;

  constructor(message: string, status: number, data: ApiErrorBody | unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.data = data;
  }
}

function extractErrorMessage(error: AxiosError<ApiErrorBody>): string {
  const data = error.response?.data;
  if (typeof data === "string" && data) return data;
  if (data && typeof data === "object") {
    if (typeof data.detail === "string") return data.detail;
    if (typeof data.message === "string") return data.message;
    const firstKey = Object.keys(data)[0];
    const val = data[firstKey];
    if (Array.isArray(val) && typeof val[0] === "string") return val[0];
    if (typeof val === "string") return val;
  }
  return error.message || "Request failed";
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens?.refresh) return null;

  try {
    const { data } = await axios.post<{ access: string }>(
      `${API_BASE_URL}/auth/refresh/`,
      { refresh: tokens.refresh },
      { timeout: REQUEST_TIMEOUT_MS },
    );
    const next: AuthTokens = { access: data.access, refresh: tokens.refresh };
    setStoredTokens(next);
    return data.access;
  } catch {
    setStoredTokens(null);
    return null;
  }
}

function queueTokenRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

function buildCacheKey(url: string, config?: AxiosRequestConfig) {
  const params = config?.params ? JSON.stringify(config.params) : "";
  return `${url}::${params}`;
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const tokens = getStoredTokens();
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }

  if (needsCsrfHeader(config.method)) {
    const csrfToken = getCookie("csrftoken");
    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes("/auth/refresh/")
    ) {
      original._retry = true;
      const access = await queueTokenRefresh();
      if (access) {
        original.headers.Authorization = `Bearer ${access}`;
        return apiClient(original);
      }
    }

    const status = error.response?.status ?? 0;
    const message = status === 0
      ? `Network error. Check that the backend is running and VITE_API_BASE_URL points to ${API_BASE_URL}.`
      : extractErrorMessage(error);
    return Promise.reject(new ApiRequestError(message, status, error.response?.data));
  },
);

/** Safe request wrapper — returns null on failure (for graceful UI fallback). */
export async function safeRequest<T>(
  fn: () => Promise<T>,
): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export async function cachedGet<T>(
  url: string,
  config?: AxiosRequestConfig,
  ttlMs = 0,
): Promise<T> {
  const cacheKey = buildCacheKey(url, config);
  const now = Date.now();
  const cached = cachedGetResponses.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.data as T;
  }

  const inflight = inflightGetRequests.get(cacheKey);
  if (inflight) {
    return inflight as Promise<T>;
  }

  const request = apiClient.get<T>(url, config).then((response) => {
    if (ttlMs > 0) {
      cachedGetResponses.set(cacheKey, {
        expiresAt: now + ttlMs,
        data: response.data,
      });
    }
    return response.data;
  }).finally(() => {
    inflightGetRequests.delete(cacheKey);
  });

  inflightGetRequests.set(cacheKey, request);
  return request;
}
