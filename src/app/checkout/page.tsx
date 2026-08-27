import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
import { getCart, getCartTotals } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

async function Checkout() {
  const user = await getCurrentUser();

  // proxy.ts only checks the cookie exists; this is where a revoked token is
  // actually caught.
  if (!user) redirect("/login?next=/checkout");

  const [cart, totals] = await Promise.all([getCart(), getCartTotals()]);

  if (cart.lines.length === 0) {
    return (
      <div className="border-border rounded-xl border border-dashed px-6 py-20 text-center">
        <p className="font-display text-xl">Your cart is empty</p>
        <p className="text-fg-muted mt-2 text-sm">
          There is nothing to check out yet.
        </p>
        <div className="mt-6">
          <ButtonLink href="/products">Browse products</ButtonLink>
        </div>
      </div>
    );
  }

  const currency = totals?.currency ?? "USD";

  // One key per visit to this page.
  //
  // It must NOT come from useId(): that is derived from the component's
  // position in the tree, so it is identical on every page load, and the API
  // would treat every later checkout as a replay of the customer's first
  // order — leaving them permanently unable to place a second one.
  //
  // Generated here rather than in the client so server and client agree, and
  // so a retry after a validation error reuses it, which is exactly what
  // idempotency is for.
  const idempotencyKey = crypto.randomUUID();

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_22rem] lg:gap-16">
      <div className="min-w-0">
        <CheckoutForm user={user} idempotencyKey={idempotencyKey} />
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="border-border rounded-xl border p-6">
          <h2 className="font-display text-lg">Order summary</h2>

          <ul className="divide-border mt-4 divide-y text-sm">
            {cart.lines.map((line) => (
              <li key={line.key} className="flex justify-between gap-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate">{line.product.name}</span>
                  <span className="text-fg-subtle text-xs">
                    Qty {line.quantity}
                  </span>
                </span>
                <span className="whitespace-nowrap tabular-nums">
                  {formatMoney(line.lineTotal, currency)}
                </span>
              </li>
            ))}
          </ul>

          {/* Every figure below comes from the API's PricingService. Nothing
              here is calculated in the browser. */}
          {totals ? (
            <>
              <dl className="border-border mt-4 space-y-2 border-t pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-fg-muted">Subtotal</dt>
                  <dd className="tabular-nums">
                    {formatMoney(totals.subtotal, currency)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-fg-muted">Shipping</dt>
                  <dd className="tabular-nums">
                    {totals.shipping_fee === 0
                      ? "Free"
                      : formatMoney(totals.shipping_fee, currency)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-fg-muted">Tax</dt>
                  <dd className="tabular-nums">
                    {formatMoney(totals.tax, currency)}
                  </dd>
                </div>
              </dl>

              <div className="border-border mt-4 flex justify-between border-t pt-4">
                <span className="font-medium">Total</span>
                <span className="font-display text-lg tabular-nums">
                  {formatMoney(totals.total, currency)}
                </span>
              </div>

              {totals.unavailable.length > 0 && (
                <p className="text-danger mt-4 text-xs">
                  Some items are no longer available in the quantity requested.{" "}
                  <Link href="/cart" className="underline underline-offset-4">
                    Review your cart
                  </Link>
                  .
                </p>
              )}
            </>
          ) : (
            <p className="text-fg-muted mt-4 text-sm">
              Totals are being calculated…
            </p>
          )}
        </div>

        <p className="text-fg-subtle mt-4 text-center text-xs">
          <Link
            href="/cart"
            className="hover:text-fg underline underline-offset-4"
          >
            Edit cart
          </Link>
        </p>
      </aside>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Container className="py-12">
      <h1 className="font-display mb-10 text-3xl sm:text-4xl">Checkout</h1>

      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Checkout />
      </Suspense>
    </Container>
  );
}
