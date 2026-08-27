import "server-only";

import { cookies } from "next/headers";
import { apiItem } from "@/lib/api";
import { SESSION_COOKIE, getSessionToken } from "@/lib/session";
import type { User } from "@/types/api";

/**
 * Session reads and cookie management.
 *
 * The Sanctum token is stored httpOnly, so it is never readable by client
 * JavaScript — an XSS can act as the user through the app's own actions, but
 * cannot exfiltrate a token to use elsewhere.
 */

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();

  store.delete(SESSION_COOKIE);
}

/**
 * The signed-in user, or null.
 *
 * Never cached: a revoked token must stop working immediately rather than
 * after a cache window. If the API rejects the token the cookie is left in
 * place — clearing it here would be a write during a render — and `proxy`
 * redirects to sign in again.
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = await getSessionToken();

  if (!token) return null;

  try {
    return await apiItem<User>("auth/me", { token, cache: "no-store" });
  } catch {
    return null;
  }
}
