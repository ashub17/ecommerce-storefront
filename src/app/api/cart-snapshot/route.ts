import { NextResponse } from "next/server";
import { getCart } from "@/lib/cart";

/**
 * Cart contents for the drawer.
 *
 * The drawer is a Client Component and cannot read the session cookie itself,
 * so this route handler resolves the cart server-side and returns only what
 * the drawer renders. The Sanctum token stays on the server.
 */
export async function GET() {
  const cart = await getCart();

  return NextResponse.json(
    {
      lines: cart.lines.map((line) => ({
        key: line.key,
        name: line.product.name,
        slug: line.product.slug,
        imageUrl: line.product.featured_image_url,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      })),
      subtotal: cart.subtotal,
      totalItems: cart.totalItems,
    },
    // Personal data: must never be stored by a shared cache.
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
