import { apiClient, getStoredTokens, setStoredTokens } from "./api";
import type { AuthTokens, AuthUser } from "./types";

export interface RegisterPayload {
  full_name: string;
  phone: string;
  email?: string;
  password: string;
  confirm_password: string;
}

export interface LoginPayload {
  login: string;
  password: string;
}

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  const { data } = await apiClient.post<AuthUser>("/auth/register/", payload);
  return data;
}

export async function login(payload: LoginPayload): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>("/auth/login/", payload);
  setStoredTokens(data);
  return data;
}

export async function googleLogin(idToken: string): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>("/auth/google/", { id_token: idToken });
  setStoredTokens(data);
  return data;
}

export async function logout(): Promise<void> {
  const tokens = getStoredTokens();
  try {
    if (tokens?.refresh) {
      await apiClient.post("/auth/logout/", { refresh: tokens.refresh });
    }
  } catch {
    // Clear local auth even if the API logout call fails.
  }
  setStoredTokens(null);
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>("/auth/me/");
  return data;
}

export async function refreshToken(refresh: string): Promise<{ access: string }> {
  const { data } = await apiClient.post<{ access: string }>("/auth/refresh/", {
    refresh,
  });
  return data;
}
