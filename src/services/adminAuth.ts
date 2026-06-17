import { apiClient, apiUrl, getStoredTokens, setStoredTokens } from "./api";
import type { AuthUser } from "./types";

export interface AdminSession {
  authenticated: boolean;
  user?: AuthUser & {
    is_active: boolean;
    is_staff: boolean;
    is_superuser: boolean;
  };
}

/** JWT-based admin login - stores tokens on success. */
export async function loginAdmin(
  email: string,
  password: string,
): Promise<AdminSession> {
  const { data } = await apiClient.post<
    AdminSession & { access: string; refresh: string }
  >(apiUrl("admin/auth/login/"), { email, password });

  // Store JWT tokens so all subsequent API calls include the Bearer header
  if (data.access && data.refresh) {
    setStoredTokens({ access: data.access, refresh: data.refresh });
  }

  return { authenticated: data.authenticated, user: data.user };
}

/** Logout: blacklist refresh token and clear stored tokens. */
export async function logoutAdmin(): Promise<void> {
  const tokens = getStoredTokens();
  try {
    await apiClient.post(apiUrl("admin/auth/logout/"), {
      refresh: tokens?.refresh ?? "",
    });
  } catch {
    // Best-effort - clear tokens regardless.
  }
  setStoredTokens(null);
}
