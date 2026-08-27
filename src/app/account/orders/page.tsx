import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/orders/order-status";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrders } from "@/lib/orders";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your orders",
  robots: { index: false, follow: false },
};

async function OrderList({
  searchParams,
}: Pick<PageProps<"/account/orders">, "searchParams">) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const { items, meta } = await getOrders(Number.isFinite(page) ? page : 1);

  if (items.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        description="When you place an order it will appear here."
        action={<ButtonLink href="/products">Start shopping</ButtonLink>}
      />
    );
  }

  return (
    <>
      <ul className="space-y-4">
        {items.map((order) => (
          <li key={order.id}>
            <Link
              href={`/account/orders/${order.id}`}
              className="border-border hover:border-border-strong block rounded-xl border p-5 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium">{order.order_number}</p>
                  <p className="text-fg-subtle mt-1 text-xs">
                    <time dateTime={order.created_at}>
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        dateStyle: "medium",
                      })}
                    </time>
                    {" · "}
                    {(order.items ?? []).length}{" "}
                    {(order.items ?? []).length === 1 ? "item" : "items"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <OrderStatusBadge status={order.status} />
                  <PaymentStatusBadge status={order.payment_status} />
                </div>
              </div>

              <div className="border-border mt-4 flex items-end justify-between border-t pt-4">
                <span className="text-fg-muted truncate text-sm">
                  {(order.items ?? [])
                    .map((item) => item.product_name)
                    .slice(0, 2)
                    .join(", ")}
                  {(order.items ?? []).length > 2 && " …"}
                </span>
                <span className="whitespace-nowrap tabular-nums">
                  {formatMoney(order.total, order.currency)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {meta && meta.last_page > 1 && (
        <nav
          aria-label="Order history pagination"
          className="mt-10 flex items-center justify-center gap-4 text-sm"
        >
          {meta.current_page > 1 && (
            <Link
              href={`/account/orders?page=${meta.current_page - 1}`}
              className="text-fg-muted hover:text-fg transition-colors"
            >
              ← Newer
            </Link>
          )}
          <span className="text-fg-subtle tabular-nums">
            Page {meta.current_page} of {meta.last_page}
          </span>
          {meta.current_page < meta.last_page && (
            <Link
              href={`/account/orders?page=${meta.current_page + 1}`}
              className="text-fg-muted hover:text-fg transition-colors"
            >
              Older →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}

export default function OrdersPage(props: PageProps<"/account/orders">) {
  return (
    <Container className="py-12">
      <div className="mb-10 flex items-baseline justify-between gap-4">
        <h1 className="font-display text-3xl sm:text-4xl">Your orders</h1>
        <Link
          href="/account"
          className="text-fg-muted hover:text-fg text-sm transition-colors"
        >
          Account
        </Link>
      </div>

      <div className="max-w-3xl">
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <OrderList searchParams={props.searchParams} />
        </Suspense>
      </div>
    </Container>
  );
}
