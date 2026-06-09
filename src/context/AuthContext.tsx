import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchCurrentUser, googleLogin, login, logout, register, type LoginPayload, type RegisterPayload } from "@/services/auth";
import { getStoredTokens } from "@/services/api";
import type { AuthUser } from "@/services/types";

interface AuthContextValue {
  currentUser: AuthUser | null;
  authLoading: boolean;
  isAuthenticated: boolean;
  loginCustomer: (payload: LoginPayload) => Promise<AuthUser>;
  loginWithGoogle: (idToken: string) => Promise<AuthUser>;
  registerCustomer: (payload: RegisterPayload) => Promise<AuthUser>;
  logoutCustomer: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!getStoredTokens()) {
      setCurrentUser(null);
      setAuthLoading(false);
      return null;
    }

    try {
      const user = await fetchCurrentUser();
      setCurrentUser(user);
      return user;
    } catch {
      setCurrentUser(null);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const loginCustomer = useCallback(async (payload: LoginPayload) => {
    setAuthLoading(true);
    try {
      await login(payload);
      const user = await fetchCurrentUser();
      setCurrentUser(user);
      return user;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    setAuthLoading(true);
    try {
      await googleLogin(idToken);
      const user = await fetchCurrentUser();
      setCurrentUser(user);
      return user;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const registerCustomer = useCallback(async (payload: RegisterPayload) => {
    const user = await register(payload);
    return user;
  }, []);

  const logoutCustomer = useCallback(async () => {
    setAuthLoading(true);
    try {
      await logout();
    } finally {
      setCurrentUser(null);
      setAuthLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    currentUser,
    authLoading,
    isAuthenticated: Boolean(currentUser),
    loginCustomer,
    loginWithGoogle,
    registerCustomer,
    logoutCustomer,
    refreshUser,
  }), [authLoading, currentUser, loginCustomer, loginWithGoogle, logoutCustomer, refreshUser, registerCustomer]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
