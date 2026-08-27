import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Route guard for pages that require a session.
 *
 * Next 16 renamed the `middleware` convention to `proxy`, and the exported
 * function must be named `proxy` too. The runtime is Node.js and cannot be
 * configured to edge.
 *
 * This only checks that a token is *present*, not that it is valid — proving
 * validity would mean an API round trip on every guarded request. The pages
 * themselves resolve the user and handle a rejected token, so this is a cheap
 * first gate that keeps signed-out visitors off private pages.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (hasSession) {
    return NextResponse.next();
  }

  const signIn = new URL("/login", request.url);

  // Remember where they were headed so sign-in can return them to it.
  signIn.searchParams.set(
    "next",
    request.nextUrl.pathname + request.nextUrl.search,
  );

  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: ["/account/:path*", "/checkout/:path*"],
};
