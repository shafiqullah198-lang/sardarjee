import { ApiRequestError, apiClient } from "./api";
import type { AuthUser } from "./types";

export interface AdminSession {
  authenticated: boolean;
  user?: AuthUser & {
    is_active: boolean;
    is_staff: boolean;
    is_superuser: boolean;
  };
}

export async function ensureAdminCsrf(): Promise<void> {
  await apiClient.get("/admin/auth/csrf/");
}

function isCsrfError(error: unknown): boolean {
  return error instanceof ApiRequestError
    && error.status === 403
    && error.message.toLowerCase().includes("csrf");
}

export async function fetchAdminSession(): Promise<AdminSession> {
  const { data } = await apiClient.get<AdminSession>("/admin/auth/session/");
  return data;
}

export async function loginAdmin(email: string, password: string): Promise<AdminSession> {
  await ensureAdminCsrf();
  try {
    const { data } = await apiClient.post<AdminSession>("/admin/auth/login/", {
      email,
      password,
    });
    return data;
  } catch (error) {
    if (!isCsrfError(error)) throw error;

    await ensureAdminCsrf();
    const { data } = await apiClient.post<AdminSession>("/admin/auth/login/", {
      email,
      password,
    });
    return data;
  }
}

export async function logoutAdmin(): Promise<void> {
  try {
    await apiClient.post("/admin/auth/logout/");
  } catch (error) {
    if (!isCsrfError(error)) throw error;

    await ensureAdminCsrf();
    await apiClient.post("/admin/auth/logout/");
  }
}
