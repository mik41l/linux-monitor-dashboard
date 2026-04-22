import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import { getJson, postJson, putJson } from "../api/client.js";

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  fullName: string;
  role: "admin" | "operator" | "viewer";
  status: "active" | "disabled";
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const tokenKey = "dashboard-auth-token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => window.localStorage.getItem(tokenKey));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(tokenKey);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!window.localStorage.getItem(tokenKey)) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await getJson<AuthUser>("/api/auth/me");
      setUser(response.data);
    } catch {
      clearSession();
    } finally {
      setIsLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const handleExpired = () => clearSession();

    window.addEventListener("dashboard-auth-expired", handleExpired);

    return () => {
      window.removeEventListener("dashboard-auth-expired", handleExpired);
    };
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await postJson<LoginResponse, { email: string; password: string }>("/api/auth/login", {
      email,
      password
    });

    window.localStorage.setItem(tokenKey, response.data.token);
    setToken(response.data.token);
    setUser(response.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await postJson<{ success: boolean }>("/api/auth/logout");
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      login,
      logout,
      refreshUser
    }),
    [isLoading, login, logout, refreshUser, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

export async function changeOwnPassword(input: { currentPassword: string; newPassword: string }) {
  return putJson<AuthUser, typeof input>("/api/auth/password", input);
}
