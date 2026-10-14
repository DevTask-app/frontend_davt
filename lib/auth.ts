import type { User } from "./types";

const TOKEN_COOKIE = "davt_token";
const USER_STORAGE_KEY = "davt_user";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getToken(): string | null {
  if (!isBrowser()) return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function setToken(token: string, expiresInSeconds = 3600): void {
  if (!isBrowser()) return;
  const maxAge = Math.max(expiresInSeconds, 60);
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(
    token,
  )}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearToken(): void {
  if (!isBrowser()) return;
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function getStoredUser(): User | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null): void {
  if (!isBrowser()) return;
  if (user === null) {
    window.localStorage.removeItem(USER_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export const authCookies = {
  token: TOKEN_COOKIE,
};
