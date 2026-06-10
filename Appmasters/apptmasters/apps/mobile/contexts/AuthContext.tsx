import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { API_BASE } from "../constants/api";

type User = { id: string; email: string; name: string };

type AuthContextType = {
  token: string | null;
  user: User | null;
  apartmentId: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, name: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshApartment: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "apptmasters_token";

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [apartmentId, setApartmentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY).then((t) => {
      if (t) {
        setToken(t);
        const payload = decodeJwtPayload(t) as { userId?: string; email?: string; apartmentId?: string };
        if (payload.apartmentId) setApartmentId(payload.apartmentId);
      }
      setIsLoading(false);
    });
  }, []);

  async function apiFetch(path: string, options: RequestInit = {}, tkn?: string) {
    const t = tkn ?? token;
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...(options.headers ?? {}),
      },
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
    return body;
  }

  async function signIn(email: string, password: string) {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    const payload = decodeJwtPayload(data.token) as { apartmentId?: string };
    setApartmentId(payload.apartmentId ?? null);
  }

  async function signUp(email: string, name: string, password: string) {
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, name, password }),
    });
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    setApartmentId(null);
  }

  async function signOut() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setApartmentId(null);
  }

  async function refreshApartment(): Promise<string | null> {
    if (!token) return null;
    try {
      const apt = await apiFetch("/api/apartment");
      if (apt?.id) {
        setApartmentId(apt.id);
        return apt.id;
      }
    } catch {}
    return null;
  }

  return (
    <AuthContext.Provider value={{ token, user, apartmentId, isLoading, signIn, signUp, signOut, refreshApartment }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
