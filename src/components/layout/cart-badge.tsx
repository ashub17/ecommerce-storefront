import { CartDrawer } from "@/components/cart/cart-drawer";
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

  return <CartDrawer count={count} />;
}

/**
 * Rendered while the count streams. A plain link, so the header never changes
 * size and the cart stays reachable before hydration.
 */
export function CartBadgeFallback() {
  return (
    <a
      href="/cart"
      className="border-border hover:border-border-strong inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm transition-colors"
    >
      Cart
    </a>
  );
}
