"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useState } from "react";
import { formatMoney } from "@/lib/utils";
import type { CartLine } from "@/lib/cart";

type CartSnapshot = {
  lines: Array<
    Pick<CartLine, "key" | "quantity" | "unitPrice" | "lineTotal"> & {
      name: string;
      slug: string;
      imageUrl: string | null;
    }
  >;
  subtotal: number;
  totalItems: number;
};

/**
 * Quick view of the cart without leaving the page.
 *
 * The contents are fetched when it opens rather than held in client state, so
 * there is one source of truth — the server — and the drawer cannot drift from
 * the cart page. Radix Dialog supplies the focus trap, scroll lock, Escape
 * handling and `aria-modal`.
 */
export function CartDrawer({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Loaded when the drawer opens rather than in an effect: the fetch is a
   * response to an interaction, not a synchronisation, and React 19 rightly
   * flags setState inside an effect for exactly this shape of code.
   */
  async function handleOpenChange(next: boolean) {
    setOpen(next);

    if (!next) return;

    setLoading(true);

    try {
      const res = await fetch("/api/cart-snapshot");
      setCart(res.ok ? await res.json() : null);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger
        aria-label={count > 0 ? `Cart, ${count} items` : "Cart"}
        className="border-border hover:border-border-strong inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm transition-colors"
      >
        Cart
        {count > 0 && (
          <span className="bg-primary text-primary-fg flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] tabular-nums">
            {count}
          </span>
        )}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />

        <Dialog.Content className="bg-bg border-border fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l">
          <div className="border-border flex items-center justify-between border-b px-6 py-4">
            <Dialog.Title className="font-display text-lg">
              Your cart
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close cart"
              className="text-fg-muted hover:text-fg text-sm transition-colors"
            >
              Close
            </Dialog.Close>
          </div>

          <Dialog.Description className="sr-only">
            A summary of the items in your cart.
          </Dialog.Description>

          <div className="flex-1 overflow-y-auto px-6">
            {loading && <p className="text-fg-muted py-8 text-sm">Loading…</p>}

            {!loading && (!cart || cart.lines.length === 0) && (
              <p className="text-fg-muted py-8 text-sm">Your cart is empty.</p>
            )}

            {!loading && cart && cart.lines.length > 0 && (
              <ul className="divide-border divide-y">
                {cart.lines.map((line) => (
                  <li key={line.key} className="flex gap-4 py-4">
                    <div className="bg-bg-subtle h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                      {line.imageUrl && (
                        // Plain img: this is a small thumbnail behind a click,
                        // so next/image's machinery buys nothing here.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={line.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 text-sm">
                      <Link
                        href={`/products/${line.slug}`}
                        onClick={() => setOpen(false)}
                        className="hover:text-fg-muted block truncate transition-colors"
                      >
                        {line.name}
                      </Link>
                      <p className="text-fg-subtle mt-1 text-xs">
                        {line.quantity} × {formatMoney(line.unitPrice)}
                      </p>
                    </div>

                    <p className="text-sm tabular-nums">
                      {formatMoney(line.lineTotal)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-border space-y-4 border-t px-6 py-5">
            <div className="flex justify-between text-sm">
              <span className="text-fg-muted">Subtotal</span>
              <span className="tabular-nums">
                {formatMoney(cart?.subtotal ?? 0)}
              </span>
            </div>

            <p className="text-fg-subtle text-xs">
              Shipping and tax calculated at checkout.
            </p>

            <Link
              href="/cart"
              onClick={() => setOpen(false)}
              className="bg-primary text-primary-fg flex h-11 w-full items-center justify-center rounded-full text-sm font-medium transition-opacity hover:opacity-90"
            >
              View cart
            </Link>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
