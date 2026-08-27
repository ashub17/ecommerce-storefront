"use server";

import { revalidatePath } from "next/cache";
import { getProduct } from "@/lib/catalog";
import { addLine, readGuestCart, writeGuestCart } from "@/lib/guest-cart";

export type AddToCartResult =
  | { ok: true; quantity: number; message: string }
  | { ok: false; message: string };

/**
 * Adds a product to the guest cart.
 *
 * Stock and availability are re-checked here against the API rather than
 * trusted from the client, so a stale page or a crafted request cannot put an
 * unavailable product — or more of one than exists — into the basket.
 */
export async function addToCart(
  slug: string,
  quantity: number,
): Promise<AddToCartResult> {
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
  const clamped = existing + requested > product.stock_quantity;

  // The header badge is rendered on the server, so it has to be refreshed.
  revalidatePath("/", "layout");

  return {
    ok: true,
    quantity: granted,
    message: clamped
      ? `Only ${product.stock_quantity} available — your cart now has ${granted}.`
      : `Added to cart.`,
  };
}
