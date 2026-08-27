import "server-only";

import { apiItem } from "@/lib/api";
import { getProducts } from "@/lib/catalog";
import { countLines, readGuestCart } from "@/lib/guest-cart";
import { getSessionToken } from "@/lib/session";
import type { Cart, CartTotals, Product } from "@/types/api";

/**
 * One cart shape for the whole storefront.
 *
 * A signed-in customer's cart lives on the server; a guest's lives in a
 * cookie. Components should not care which — they get the same `CartView`
 * either way, so the cart page and drawer are written once.
 *
 * Prices are never read from the cookie. A guest cart stores ids and
 * quantities only, and the money is fetched from the API every time, so a
 * tampered cookie can change what is in the basket but never what it costs.
 */

export type CartLine = {
  /** Stable identity for form actions: the cart item id, or the product id. */
  key: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  /** Whether the requested quantity still fits available stock. */
  exceedsStock: boolean;
};

export type CartView = {
  lines: CartLine[];
  subtotal: number;
  totalItems: number;
  isGuest: boolean;
};

const EMPTY: CartView = {
  lines: [],
  subtotal: 0,
  totalItems: 0,
  isGuest: true,
};

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildLine(key: string, product: Product, quantity: number): CartLine {
  const unitPrice = product.current_price;

  return {
    key,
    product,
    quantity,
    unitPrice,
    lineTotal: round(unitPrice * quantity),
    exceedsStock: quantity > product.stock_quantity,
  };
}

/** The signed-in customer's cart, straight from the API. */
async function getServerCart(token: string): Promise<CartView> {
  const cart = await apiItem<Cart>("cart", { token, cache: "no-store" });

  const lines = (cart.items ?? [])
    .filter((item) => item.product)
    .map((item) =>
      buildLine(String(item.id), item.product as Product, item.quantity),
    );

  return {
    lines,
    subtotal: round(lines.reduce((sum, line) => sum + line.lineTotal, 0)),
    totalItems: lines.reduce((sum, line) => sum + line.quantity, 0),
    isGuest: false,
  };
}

/**
 * The guest cart, hydrated from the API.
 *
 * One batched request by id rather than one per line — this is what the
 * `?ids=` filter added in Step 0 exists for.
 */
async function getCookieCart(): Promise<CartView> {
  const stored = await readGuestCart();

  if (stored.length === 0) return EMPTY;

  const { items } = await getProducts({
    ids: stored.map((line) => line.product_id).join(","),
    per_page: 60,
  });

  const byId = new Map(items.map((product) => [product.id, product]));

  const lines = stored
    // A product that has since been deactivated or deleted simply drops out.
    .filter((line) => byId.has(line.product_id))
    .map((line) =>
      buildLine(
        String(line.product_id),
        byId.get(line.product_id) as Product,
        line.quantity,
      ),
    );

  return {
    lines,
    subtotal: round(lines.reduce((sum, line) => sum + line.lineTotal, 0)),
    totalItems: lines.reduce((sum, line) => sum + line.quantity, 0),
    isGuest: true,
  };
}

export async function getCart(): Promise<CartView> {
  const token = await getSessionToken();

  try {
    return token ? await getServerCart(token) : await getCookieCart();
  } catch {
    // A failed cart read must not take the page down with it.
    return EMPTY;
  }
}

/** Cheap count for the header badge — avoids hydrating full product data. */
export async function getCartCount(): Promise<number> {
  const token = await getSessionToken();

  if (!token) {
    return countLines(await readGuestCart().catch(() => []));
  }

  try {
    const cart = await apiItem<Cart>("cart", { token, cache: "no-store" });
    return cart.total_items ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Tax, shipping and total for the signed-in cart, calculated by the API.
 *
 * Deliberately not derived on the client: `PricingService` is the only
 * authority on pricing, and a storefront that recomputes it will eventually
 * quote a total the server disagrees with.
 */
export async function getCartTotals(): Promise<CartTotals | null> {
  const token = await getSessionToken();

  if (!token) return null;

  try {
    return await apiItem<CartTotals>("cart/totals", {
      token,
      cache: "no-store",
    });
  } catch {
    return null;
  }
}
