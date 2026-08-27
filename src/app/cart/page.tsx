import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ClearCartButton } from "@/components/cart/clear-cart-button";
import { CartLineItem } from "@/components/cart/cart-line-item";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getCart } from "@/lib/cart";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your cart",
  // A personal page has nothing to offer a search engine.
  robots: { index: false, follow: false },
};

function CartSkeleton() {
  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex gap-5">
            <Skeleton className="aspect-square w-24 rounded-lg" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-32 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}

async function CartContents() {
  const cart = await getCart();

  if (cart.lines.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Once you add something, it will show up here."
        action={<ButtonLink href="/products">Browse products</ButtonLink>}
      />
    );
  }

  const blocked = cart.lines.some((line) => line.exceedsStock);

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16">
      <div>
        <ul>
          {cart.lines.map((line) => (
            <CartLineItem key={line.key} line={line} />
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between">
          <Link
            href="/products"
            className="text-fg-muted hover:text-fg text-sm transition-colors"
          >
            ← Continue shopping
          </Link>

          <ClearCartButton />
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="border-border rounded-xl border p-6">
          <h2 className="font-display text-lg">Summary</h2>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-fg-muted">
                Subtotal ({cart.totalItems}{" "}
                {cart.totalItems === 1 ? "item" : "items"})
              </dt>
              <dd className="tabular-nums">{formatMoney(cart.subtotal)}</dd>
            </div>

            {/* Tax and shipping are calculated by the API's PricingService at
                checkout. Guessing them here risks showing a total the server
                will disagree with. */}
            <div className="flex justify-between">
              <dt className="text-fg-muted">Shipping &amp; tax</dt>
              <dd className="text-fg-muted text-xs">Calculated at checkout</dd>
            </div>
          </dl>

          <div className="border-border mt-5 flex justify-between border-t pt-5">
            <span className="text-sm font-medium">Estimated total</span>
            <span className="tabular-nums">{formatMoney(cart.subtotal)}</span>
          </div>

          {blocked ? (
            <>
              <button
                disabled
                className="bg-primary text-primary-fg mt-6 h-12 w-full cursor-not-allowed rounded-full text-sm font-medium opacity-50"
              >
                Checkout
              </button>
              <p className="text-danger mt-3 text-xs">
                Reduce the highlighted quantities before checking out.
              </p>
            </>
          ) : (
            <ButtonLink href="/checkout" size="lg" className="mt-6 w-full">
              Checkout
            </ButtonLink>
          )}

          {cart.isGuest && (
            <p className="text-fg-muted mt-4 text-xs leading-relaxed">
              <Link href="/login" className="underline underline-offset-4">
                Sign in
              </Link>{" "}
              to save your cart — it will be kept when you do.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

export default function CartPage() {
  return (
    <Container className="py-12">
      <h1 className="font-display mb-10 text-3xl sm:text-4xl">Your cart</h1>

      <Suspense fallback={<CartSkeleton />}>
        <CartContents />
      </Suspense>
    </Container>
  );
}
