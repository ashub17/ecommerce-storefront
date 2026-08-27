import Link from "next/link";
import { getCartCount } from "@/lib/cart";

/**
 * The cart link, split out because it reads a cookie.
 *
 * Under Cache Components, request-time data must sit inside a Suspense
 * boundary or it blocks the whole route's static shell. Isolating it here
 * means the rest of the site still prerenders, and only the count streams in.
 */
export async function CartBadge() {
  // Resolves to the server cart when signed in, the cookie otherwise.
  const count = await getCartCount();

  return (
    <>
      Cart
      {count > 0 && (
        <>
          <span className="bg-primary text-primary-fg flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] tabular-nums">
            {count}
          </span>
          <span className="sr-only">{count} items in cart</span>
        </>
      )}
    </>
  );
}

/**
 * Rendered while the count streams. It is the link without the badge, so the
 * header never changes size — the count appears rather than pushing anything.
 */
export function CartBadgeFallback() {
  return <>Cart</>;
}

export function CartLink({ children }: { children: React.ReactNode }) {
  return (
    <Link
      href="/cart"
      className="border-border hover:border-border-strong inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm transition-colors"
    >
      {children}
    </Link>
  );
}
