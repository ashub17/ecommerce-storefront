import "server-only";

import { apiItem, apiList } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
import type { Order, PaginationMeta } from "@/types/api";

/**
 * Order reads. Never cached — an order's status and payment state must
 * reflect the moment it is asked for.
 */

export async function getOrders(page = 1): Promise<{
  items: Order[];
  meta: PaginationMeta | null;
}> {
  const token = await getSessionToken();

  if (!token) return { items: [], meta: null };

  try {
    return await apiList<Order>("orders", {
      token,
      query: { page },
      cache: "no-store",
    });
  } catch {
    return { items: [], meta: null };
  }
}

export async function getOrder(id: number | string): Promise<Order | null> {
  const token = await getSessionToken();

  if (!token) return null;

  try {
    return await apiItem<Order>(`orders/${encodeURIComponent(String(id))}`, {
      token,
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

/**
 * Finds an order by its human-facing number.
 *
 * The API addresses orders by id, so this pages through the customer's own
 * orders. Confirmation and payment screens are reached with a number rather
 * than an id because that is what appears in emails.
 */
export async function getOrderByNumber(
  orderNumber: string,
): Promise<Order | null> {
  const token = await getSessionToken();

  if (!token) return null;

  for (let page = 1; page <= 5; page++) {
    const { items, meta } = await getOrders(page);
    const match = items.find((order) => order.order_number === orderNumber);

    if (match) {
      // The list omits nothing we need, but fetch by id so the shape is the
      // same as every other single-order read.
      return (await getOrder(match.id)) ?? match;
    }

    if (!meta || page >= meta.last_page) break;
  }

  return null;
}
