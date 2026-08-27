"use server";

import { ApiError, apiFetch } from "@/lib/api";
import { getProduct } from "@/lib/catalog";
import {
  addLine,
  readGuestCart,
  writeGuestCart,
  type GuestCartLine,
} from "@/lib/guest-cart";
import { getSessionToken } from "@/lib/session";

export type CartActionResult =
  { ok: true; message: string } | { ok: false; message: string };

/**
 * Cart mutations.
 *
 * Each one dispatches on whether there is a session: a signed-in customer's
 * changes go to the API, a guest's to the cookie. Callers do not branch.
 *
 * Stock is always re-checked server-side rather than trusted from the client,
 * so a stale page cannot add an unavailable product or exceed what exists.
 */

/**
 * Server Actions already refresh the route they were called from, layout
 * included, so the header badge updates on its own.
 *
 * Calling revalidatePath() here as well triggers a re-render inside the same
 * request that just wrote a cookie, and Next throws an invariant when a
 * component then reads cookies() from that render.
 */
function refresh(): void {}

function messageFrom(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    // The API returns field-scoped errors; surface the first real one.
    const first = Object.values(error.errors)[0]?.[0];
    return first ?? error.message ?? fallback;
  }

  return fallback;
}

export async function addToCart(
  slug: string,
  quantity: number,
): Promise<CartActionResult & { quantity?: number }> {
  const requested = Math.floor(Number(quantity));

  if (!Number.isFinite(requested) || requested < 1) {
    return { ok: false, message: "Choose a valid quantity." };
  }

  let product;

  try {
    product = await getProduct(slug);
  } catch {
    return { ok: false, message: "That product could not be found." };
  }

  if (!product.is_active) {
    return { ok: false, message: "That product is no longer available." };
  }

  if (product.stock_quantity < 1) {
    return { ok: false, message: "That product is out of stock." };
  }

  const token = await getSessionToken();

  if (token) {
    try {
      await apiFetch("cart", {
        method: "POST",
        token,
        body: { product_id: product.id, quantity: requested },
      });
    } catch (error) {
      return {
        ok: false,
        message: messageFrom(error, "Could not add that to your cart."),
      };
    }

    refresh();
    return { ok: true, message: "Added to cart." };
  }

  const lines = await readGuestCart();
  const existing =
    lines.find((line) => line.product_id === product.id)?.quantity ?? 0;

  if (existing >= product.stock_quantity) {
    return {
      ok: false,
      message: `You already have all ${product.stock_quantity} available in your cart.`,
    };
  }

  const next = addLine(lines, product.id, requested, product.stock_quantity);
  await writeGuestCart(next);

  const granted =
    next.find((line) => line.product_id === product.id)?.quantity ?? 0;

  refresh();

  return {
    ok: true,
    quantity: granted,
    message:
      existing + requested > product.stock_quantity
        ? `Only ${product.stock_quantity} available — your cart now has ${granted}.`
        : "Added to cart.",
  };
}

/**
 * `key` is the cart item id when signed in, and the product id for a guest —
 * whichever identity `CartLine` carries.
 */
export async function setCartQuantity(
  key: string,
  quantity: number,
): Promise<CartActionResult> {
  const next = Math.floor(Number(quantity));

  if (!Number.isFinite(next) || next < 0) {
    return { ok: false, message: "Choose a valid quantity." };
  }

  if (next === 0) {
    return removeFromCart(key);
  }

  const token = await getSessionToken();

  if (token) {
    try {
      await apiFetch(`cart/${encodeURIComponent(key)}`, {
        method: "PUT",
        token,
        body: { quantity: next },
      });
    } catch (error) {
      return {
        ok: false,
        message: messageFrom(error, "Could not update that item."),
      };
    }

    refresh();
    return { ok: true, message: "Cart updated." };
  }

  const productId = Number(key);
  const lines = await readGuestCart();

  if (!lines.some((line) => line.product_id === productId)) {
    return { ok: false, message: "That item is no longer in your cart." };
  }

  // Re-check stock: the cookie may have been sitting there for weeks.
  let stock = Number.POSITIVE_INFINITY;
  let name = "This product";

  try {
    const { items } = await import("@/lib/catalog").then((m) =>
      m.getProducts({ ids: String(productId), per_page: 1 }),
    );

    if (items[0]) {
      stock = items[0].stock_quantity;
      name = items[0].name;
    }
  } catch {
    // Fall through and trust the requested quantity; checkout re-validates.
  }

  const granted = Math.min(next, stock);

  const updated: GuestCartLine[] = lines.map((line) =>
    line.product_id === productId ? { ...line, quantity: granted } : line,
  );

  await writeGuestCart(updated);
  refresh();

  return granted < next
    ? { ok: false, message: `Only ${granted} of ${name} available.` }
    : { ok: true, message: "Cart updated." };
}

export async function removeFromCart(key: string): Promise<CartActionResult> {
  const token = await getSessionToken();

  if (token) {
    try {
      await apiFetch(`cart/${encodeURIComponent(key)}`, {
        method: "DELETE",
        token,
      });
    } catch (error) {
      return {
        ok: false,
        message: messageFrom(error, "Could not remove that item."),
      };
    }

    refresh();
    return { ok: true, message: "Item removed." };
  }

  const productId = Number(key);
  const lines = await readGuestCart();

  await writeGuestCart(lines.filter((line) => line.product_id !== productId));
  refresh();

  return { ok: true, message: "Item removed." };
}

export async function clearCart(): Promise<CartActionResult> {
  const token = await getSessionToken();

  if (token) {
    try {
      await apiFetch("cart", { method: "DELETE", token });
    } catch (error) {
      return {
        ok: false,
        message: messageFrom(error, "Could not empty your cart."),
      };
    }
  } else {
    await writeGuestCart([]);
  }

  refresh();
  return { ok: true, message: "Cart emptied." };
}

/**
 * Folds a guest cart into the server cart at sign-in.
 *
 * Called by the login flow in Step 6. The API is deliberately tolerant here:
 * lines that sold out in the meantime are skipped or clamped and reported,
 * rather than failing the whole basket.
 */
export async function mergeGuestCart(token: string): Promise<string[]> {
  const lines = await readGuestCart();

  if (lines.length === 0) return [];

  try {
    const response = await apiFetch<{
      data: { adjustments: Array<{ message: string }> };
    }>("cart/merge", {
      method: "POST",
      token,
      body: { items: lines },
    });

    await writeGuestCart([]);
    refresh();

    return (response.data.adjustments ?? []).map((a) => a.message);
  } catch {
    // The sign-in itself must not fail because the merge did.
    return [];
  }
}
