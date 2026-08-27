import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CancelOrder } from "@/components/orders/cancel-order";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/orders/order-status";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrder } from "@/lib/orders";
import { formatMoney } from "@/lib/utils";
import type { Address } from "@/types/api";

export const metadata: Metadata = {
  title: "Order detail",
  robots: { index: false, follow: false },
};

function AddressBlock({ title, address }: { title: string; address: Address }) {
  return (
    <div>
      <h3 className="text-fg-muted text-xs tracking-wide uppercase">{title}</h3>
      <address className="mt-2 text-sm not-italic">
        {address.full_name}
        <br />
        {address.address_line1}
        {address.address_line2 && (
          <>
            <br />
            {address.address_line2}
          </>
        )}
        <br />
        {address.city}
        {address.state ? `, ${address.state}` : ""}
        {address.postal_code ? ` ${address.postal_code}` : ""}
        <br />
        {address.country}
        {address.phone && (
          <>
            <br />
            <span className="text-fg-muted">{address.phone}</span>
          </>
        )}
      </address>
    </div>
  );
}

async function OrderDetail({
  params,
  searchParams,
}: Pick<PageProps<"/account/orders/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  const query = await searchParams;
  const confirmingCancel = query.confirm === "cancel";
  const order = await getOrder(id);

  // getOrder returns null for another customer's order too, because the API
  // scopes the lookup to the authenticated user — so this is both "missing"
  // and "not yours".
  if (!order) notFound();

  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">
            {order.order_number}
          </h1>
          <p className="text-fg-subtle mt-2 text-sm">
            Placed{" "}
            <time dateTime={order.created_at}>
              {new Date(order.created_at).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </time>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.payment_status} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_18rem] lg:gap-12">
        <div className="min-w-0 space-y-8">
          <section className="border-border rounded-xl border p-6">
            <h2 className="font-display text-lg">Items</h2>

            <ul className="divide-border mt-4 divide-y text-sm">
              {(order.items ?? []).map((item) => (
                <li key={item.id} className="flex justify-between gap-4 py-3">
                  <span className="min-w-0">
                    {/* product_name is the snapshot taken at checkout, so a
                        later rename does not rewrite order history. */}
                    <span className="block">{item.product_name}</span>
                    <span className="text-fg-subtle text-xs">
                      {formatMoney(item.product_price, order.currency)} ×{" "}
                      {item.quantity}
                    </span>
                  </span>
                  <span className="whitespace-nowrap tabular-nums">
                    {formatMoney(item.subtotal, order.currency)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="border-border mt-4 space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-fg-muted">Subtotal</dt>
                <dd className="tabular-nums">
                  {formatMoney(order.subtotal, order.currency)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-fg-muted">Shipping</dt>
                <dd className="tabular-nums">
                  {Number(order.shipping_fee) === 0
                    ? "Free"
                    : formatMoney(order.shipping_fee, order.currency)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-fg-muted">Tax</dt>
                <dd className="tabular-nums">
                  {formatMoney(order.tax, order.currency)}
                </dd>
              </div>
            </dl>

            <div className="border-border mt-4 flex justify-between border-t pt-4">
              <span className="font-medium">Total</span>
              <span className="font-display text-lg tabular-nums">
                {formatMoney(order.total, order.currency)}
              </span>
            </div>
          </section>

          {(order.shipping_address || order.billing_address) && (
            <section className="border-border grid gap-8 rounded-xl border p-6 sm:grid-cols-2">
              {order.shipping_address && (
                <AddressBlock
                  title="Shipping to"
                  address={order.shipping_address}
                />
              )}
              {order.billing_address && (
                <AddressBlock
                  title="Billed to"
                  address={order.billing_address}
                />
              )}
            </section>
          )}

          <div className="flex flex-wrap items-center gap-4">
            {order.payment_status !== "paid" &&
              order.status !== "cancelled" && (
                <ButtonLink
                  href={`/checkout/payment/${order.order_number}`}
                  size="sm"
                >
                  Complete payment
                </ButtonLink>
              )}

            {/* is_cancellable is the API's decision, not ours. */}
            {order.is_cancellable && (
              <CancelOrder orderId={order.id} confirming={confirmingCancel} />
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <section className="border-border rounded-xl border p-6">
            <h2 className="font-display text-lg">History</h2>
            <div className="mt-5">
              <OrderTimeline histories={order.status_histories ?? []} />
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

export default function OrderDetailPage(
  props: PageProps<"/account/orders/[id]">,
) {
  return (
    <Container className="py-12">
      <nav aria-label="Breadcrumb" className="text-fg-muted mb-8 text-sm">
        <Link
          href="/account/orders"
          className="hover:text-fg transition-colors"
        >
          ← Your orders
        </Link>
      </nav>

      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <OrderDetail params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </Container>
  );
}
