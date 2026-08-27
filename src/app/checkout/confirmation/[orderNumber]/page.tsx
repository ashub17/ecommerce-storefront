import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrderByNumber } from "@/lib/orders";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false, follow: false },
};

async function ConfirmationView({
  params,
}: Pick<PageProps<"/checkout/confirmation/[orderNumber]">, "params">) {
  const { orderNumber } = await params;
  const order = await getOrderByNumber(orderNumber);

  if (!order) notFound();

  const paid = order.payment_status === "paid";

  return (
    <>
      <div className="text-center">
        <p className="text-success text-4xl" aria-hidden="true">
          ✓
        </p>
        <h1 className="font-display mt-4 text-3xl">Thank you</h1>
        <p className="text-fg-muted mt-3 text-sm leading-relaxed">
          Order <span className="font-medium">{order.order_number}</span> is
          confirmed. We&apos;ve emailed you a receipt and will be in touch when
          it ships.
        </p>
      </div>

      <div className="border-border mt-10 rounded-xl border p-6">
        <h2 className="font-display text-lg">What you ordered</h2>

        <ul className="divide-border mt-4 divide-y text-sm">
          {(order.items ?? []).map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-3">
              <span className="min-w-0">
                <span className="block">{item.product_name}</span>
                <span className="text-fg-subtle text-xs">
                  Qty {item.quantity}
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

        <div className="border-border mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t pt-4 text-sm">
          <p>
            <span className="text-fg-muted">Status: </span>
            {order.status}
          </p>
          <p>
            <span className="text-fg-muted">Payment: </span>
            {order.payment_status}
          </p>
        </div>

        {!paid && (
          <p className="text-fg-muted mt-4 text-sm">
            This order is not paid yet.{" "}
            <Link
              href={`/checkout/payment/${order.order_number}`}
              className="underline underline-offset-4"
            >
              Complete payment
            </Link>
            .
          </p>
        )}
      </div>

      {order.shipping_address && (
        <div className="border-border mt-6 rounded-xl border p-6 text-sm">
          <h2 className="font-display text-lg">Shipping to</h2>
          <address className="text-fg-muted mt-3 not-italic">
            {order.shipping_address.full_name}
            <br />
            {order.shipping_address.address_line1}
            {order.shipping_address.address_line2 && (
              <>
                <br />
                {order.shipping_address.address_line2}
              </>
            )}
            <br />
            {order.shipping_address.city}
            {order.shipping_address.postal_code
              ? ` ${order.shipping_address.postal_code}`
              : ""}
            <br />
            {order.shipping_address.country}
          </address>
        </div>
      )}

      <div className="mt-10 flex justify-center gap-3">
        <ButtonLink href="/account/orders">View your orders</ButtonLink>
        <ButtonLink href="/products" variant="secondary">
          Keep shopping
        </ButtonLink>
      </div>
    </>
  );
}

export default function ConfirmationPage(
  props: PageProps<"/checkout/confirmation/[orderNumber]">,
) {
  return (
    <Container>
      <div className="mx-auto w-full max-w-lg py-20">
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
          <ConfirmationView params={props.params} />
        </Suspense>
      </div>
    </Container>
  );
}
