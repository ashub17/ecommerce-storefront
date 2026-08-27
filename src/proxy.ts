import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Next 16 renamed the `middleware` convention to `proxy`, and the exported
 * function must be named `proxy` too. The runtime is Node.js and cannot be
 * configured to edge.
 *
 * Two jobs: gate private pages, and stop unknown product URLs being indexed.
 */

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

/**
 * Known product slugs, cached in module scope.
 *
 * Without this the check would cost an API round trip on every product view.
 * The list only needs to be roughly current: a slug that has just been added
 * is treated as unknown for at most one refresh window, and the consequence is
 * a `noindex` header on a page that would have been indexed slightly sooner.
 */
const SLUG_TTL_MS = 5 * 60 * 1000;

let slugCache: { slugs: Set<string>; fetchedAt: number } | null = null;
let inFlight: Promise<Set<string>> | null = null;

async function knownSlugs(): Promise<Set<string> | null> {
  const now = Date.now();

  if (slugCache && now - slugCache.fetchedAt < SLUG_TTL_MS) {
    return slugCache.slugs;
  }

  // Collapse concurrent refreshes into one request.
  inFlight ??= (async () => {
    const res = await fetch(`${API_URL}/api/products?per_page=60`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const payload = await res.json();
    const slugs = new Set<string>(
      (payload.data ?? []).map((product: { slug: string }) => product.slug),
    );

    slugCache = { slugs, fetchedAt: Date.now() };

    return slugs;
  })();

  try {
    return await inFlight;
  } catch {
    // If the API is unreachable, fall back to the last known list rather than
    // marking every product page noindex.
    return slugCache?.slugs ?? null;
  } finally {
    inFlight = null;
  }
}

function requireSession(request: NextRequest): NextResponse | null {
  if (request.cookies.has(SESSION_COOKIE)) return null;

  const signIn = new URL("/login", request.url);

  signIn.searchParams.set(
    "next",
    request.nextUrl.pathname + request.nextUrl.search,
  );

  return NextResponse.redirect(signIn);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/account") || pathname.startsWith("/checkout")) {
    // Only checks that a token is present. Proving it valid would mean an API
    // round trip per request; the pages resolve the user and handle a revoked
    // token themselves.
    return requireSession(request) ?? NextResponse.next();
  }

  const productMatch = pathname.match(/^\/products\/([^/]+)$/);

  if (productMatch) {
    const slugs = await knownSlugs();
    const slug = decodeURIComponent(productMatch[1]);

    if (slugs && !slugs.has(slug)) {
      /*
       * An unknown slug renders the branded 404 UI, but Partial Prerendering
       * has already committed the response to 200 by the time the lookup
       * resolves — the status cannot change mid-stream.
       *
       * `X-Robots-Tag` is the fix that works: it is a header, so it is set
       * before the body streams, and search engines honour it exactly like the
       * meta tag. The meta-tag route does not work here, because calling
       * notFound() swaps in the not-found boundary and discards the page's own
       * metadata.
       *
       * This leaves a soft 404 — correct content, wrong status code — but it
       * is no longer indexable, which is what actually mattered.
       */
      const response = NextResponse.next();

      response.headers.set("X-Robots-Tag", "noindex, nofollow");

      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/checkout/:path*", "/products/:slug"],
};
