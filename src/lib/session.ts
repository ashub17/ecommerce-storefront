import "server-only";

import { cookies } from "next/headers";

/**
 * The signed-in session.
 *
 * The Sanctum bearer token lives in an httpOnly cookie, so it is readable by
 * Server Components and Server Actions but never by client JavaScript. This
 * module is the only thing that touches it.
 *
 * Step 6 adds the routes that set and clear the cookie; everything downstream
 * already works in terms of "is there a token", so nothing else changes then.
 */

export const SESSION_COOKIE = "session_token";

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();

  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function isSignedIn(): Promise<boolean> {
  return (await getSessionToken()) !== null;
}
