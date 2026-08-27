import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConfirmPayment } from "@/components/checkout/confirm-payment";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrderByNumber } from "@/lib/orders";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Payment",
  robots: { index: false, follow: false },
};

async function PaymentView({
  params,
}: Pick<PageProps<"/checkout/payment/[orderNumber]">, "params">) {
  const { orderNumber } = await params;
  const order = await getOrderByNumber(orderNumber);

  if (!order) notFound();

  // Already settled — nothing to pay for.
  if (order.payment_status === "paid") {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl">This order is already paid</h1>
        <p className="text-fg-muted mt-3 text-sm">
          Order {order.order_number} is settled.
        </p>
        <p className="mt-6">
          <Link
            href={`/checkout/confirmation/${order.order_number}`}
            className="underline underline-offset-4"
          >
            View your confirmation
          </Link>
        </p>
      </div>
    );
  }

  const pending = order.payments?.find((p) => p.status === "pending");

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="font-display text-2xl">Confirm your payment</h1>
        <p className="text-fg-muted mt-3 text-sm">
          Order {order.order_number} —{" "}
          <span className="tabular-nums">
            {formatMoney(order.total, order.currency)}
          </span>
        </p>
      </div>

      {pending ? (
        <ConfirmPayment
          reference={pending.reference}
          orderNumber={order.order_number}
        />
      ) : (
        <p className="text-fg-muted text-center text-sm">
          No payment attempt is open for this order.{" "}
          <Link href="/account/orders" className="underline underline-offset-4">
            View your orders
          </Link>
          .
        </p>
      )}
    </>
  );
}

export default function PaymentPage(
  props: PageProps<"/checkout/payment/[orderNumber]">,
) {
  return (
    <Container>
      <div className="mx-auto w-full max-w-md py-20">
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <PaymentView params={props.params} />
        </Suspense>
      </div>
    </Container>
  );
}
