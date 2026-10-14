"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  clearToken,
  getToken,
  setStoredUser,
  setToken,
} from "@/lib/auth";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (
    input: { email: string; password: string },
    redirectTo?: string,
  ) => Promise<void>;
  register: (
    input: {
      name: string;
      email: string;
      password: string;
      password_confirmation: string;
    },
    redirectTo?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setStoredUser(null);
      setLoading(false);
      return;
    }
    try {
      const response = await api.me();
      setUser(response.data);
      setStoredUser(response.data);
    } catch {
      clearToken();
      setStoredUser(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const token = getToken();
    const request = token ? api.me() : Promise.reject(new Error("no-token"));

    request
      .then((response) => {
        if (!active) return;
        setUser(response.data);
        setStoredUser(response.data);
      })
      .catch(() => {
        if (!active) return;
        clearToken();
        setStoredUser(null);
        setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (
      input: { email: string; password: string },
      redirectTo = "/dashboard",
    ) => {
      const token = await api.login(input);
      setToken(token.access_token, token.expires_in);
      const me = await api.me();
      setUser(me.data);
      setStoredUser(me.data);
      router.push(redirectTo);
      router.refresh();
    },
    [router],
  );

  const register = useCallback(
    async (
      input: {
        name: string;
        email: string;
        password: string;
        password_confirmation: string;
      },
      redirectTo = "/dashboard",
    ) => {
      const token = await api.register(input);
      setToken(token.access_token, token.expires_in);
      const me = await api.me();
      setUser(me.data);
      setStoredUser(me.data);
      router.push(redirectTo);
      router.refresh();
    },
    [router],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network/logout failures; clear the local session anyway.
    }
    clearToken();
    setStoredUser(null);
    setUser(null);
    router.push("/login");
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh: loadUser }),
    [user, loading, login, register, logout, loadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus dipakai di dalam AuthProvider");
  }
  return context;
}
