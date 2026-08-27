import "server-only";

import { cookies } from "next/headers";

/**
 * The guest cart.
 *
 * Held in a cookie rather than localStorage so Server Components can read it —
 * that lets the header badge and the cart page render on the server with no
 * flash of an empty cart.
 *
 * Only product ids and quantities are stored. Prices always come from the API,
 * never from the client, so a tampered cookie can change what is in the basket
 * but never what it costs.
 *
 * The shape matches what POST /api/cart/merge expects, so signing in hands the
 * server this array unchanged.
 */

export const GUEST_CART_COOKIE = "guest_cart";

const MAX_LINES = 50;
const MAX_QUANTITY = 999;

export type GuestCartLine = {
  product_id: number;
  quantity: number;
};

function sanitise(value: unknown): GuestCartLine[] {
  if (!Array.isArray(value)) return [];

  const lines: GuestCartLine[] = [];

  for (const entry of value.slice(0, MAX_LINES)) {
    const productId = Number((entry as GuestCartLine)?.product_id);
    const quantity = Number((entry as GuestCartLine)?.quantity);

    if (!Number.isInteger(productId) || productId < 1) continue;
    if (!Number.isFinite(quantity) || quantity < 1) continue;

    lines.push({
      product_id: productId,
      quantity: Math.min(Math.floor(quantity), MAX_QUANTITY),
    });
  }

  return lines;
}

export async function readGuestCart(): Promise<GuestCartLine[]> {
  // Next 16: cookies() is async.
  const store = await cookies();
  const raw = store.get(GUEST_CART_COOKIE)?.value;

  if (!raw) return [];

  try {
    // The cookie is user-controlled, so it is parsed defensively rather than
    // trusted — a malformed value yields an empty cart, not a crash.
    return sanitise(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Writable only from a Server Action or Route Handler. */
export async function writeGuestCart(lines: GuestCartLine[]): Promise<void> {
  const store = await cookies();

  if (lines.length === 0) {
    store.delete(GUEST_CART_COOKIE);
    return;
  }

  store.set(GUEST_CART_COOKIE, JSON.stringify(sanitise(lines)), {
    // Readable by the server only. Nothing in the browser needs it, and
    // keeping it out of JavaScript removes it as an XSS target.
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** Adds a quantity, merging with any existing line for the same product. */
export function addLine(
  lines: GuestCartLine[],
  productId: number,
  quantity: number,
  stockLimit: number,
): GuestCartLine[] {
  const existing = lines.find((line) => line.product_id === productId);
  const requested = (existing?.quantity ?? 0) + quantity;
  const granted = Math.max(1, Math.min(requested, stockLimit));

  if (existing) {
    return lines.map((line) =>
      line.product_id === productId ? { ...line, quantity: granted } : line,
    );
  }

  return [...lines, { product_id: productId, quantity: granted }];
}

export function countLines(lines: GuestCartLine[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}
