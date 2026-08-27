"use client";

import Image from "next/image";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { removeFromCart, setCartQuantity } from "@/app/actions/cart";
import { formatMoney } from "@/lib/utils";
import type { CartLine } from "@/lib/cart";

/**
 * One cart row.
 *
 * Quantity changes are optimistic: the number and line total move immediately
 * and the server confirms behind it. A cart that lags a third of a second
 * behind every click feels broken even when it is correct.
 */
export function CartLineItem({
  line,
  currency = "USD",
}: {
  line: CartLine;
  currency?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [optimisticQuantity, setOptimisticQuantity] = useOptimistic(
    line.quantity,
    (_current, next: number) => next,
  );

  const max = Math.max(1, line.product.stock_quantity);

  function change(next: number) {
    const clamped = Math.min(Math.max(0, next), max);

    startTransition(async () => {
      setError(null);
      setOptimisticQuantity(clamped);

      const result =
        clamped === 0
          ? await removeFromCart(line.key)
          : await setCartQuantity(line.key, clamped);

      // The server is authoritative; on rejection the optimistic value is
      // discarded when the transition settles and the real one re-renders.
      if (!result.ok) setError(result.message);
    });
  }

  function remove() {
    startTransition(async () => {
      setError(null);
      setOptimisticQuantity(0);

      const result = await removeFromCart(line.key);
      if (!result.ok) setError(result.message);
    });
  }

  const lineTotal = line.unitPrice * optimisticQuantity;

  return (
    <li
      className={`border-border flex gap-5 border-b py-6 ${isPending ? "opacity-60" : ""}`}
    >
      <Link
        href={`/products/${line.product.slug}`}
        className="bg-bg-subtle relative aspect-square w-24 shrink-0 overflow-hidden rounded-lg"
      >
        {line.product.featured_image_url ? (
          <Image
            src={line.product.featured_image_url}
            alt={line.product.name}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <span className="text-fg-subtle font-display flex h-full items-center justify-center text-2xl">
            {line.product.name[0]}
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href={`/products/${line.product.slug}`}
              className="hover:text-fg-muted text-sm transition-colors"
            >
              {line.product.name}
            </Link>
            <p className="text-fg-subtle mt-1 text-xs">
              {formatMoney(line.unitPrice, currency)} each
            </p>
          </div>

          <p className="text-sm whitespace-nowrap tabular-nums">
            {formatMoney(lineTotal, currency)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="border-border inline-flex h-9 items-center rounded-full border">
            <button
              type="button"
              onClick={() => change(optimisticQuantity - 1)}
              disabled={isPending}
              aria-label={`Decrease quantity of ${line.product.name}`}
              className="text-fg-muted hover:text-fg flex h-full w-9 items-center justify-center rounded-l-full transition-colors disabled:opacity-40"
            >
              −
            </button>

            <span
              className="w-8 text-center text-sm tabular-nums"
              aria-live="polite"
            >
              {optimisticQuantity}
            </span>

            <button
              type="button"
              onClick={() => change(optimisticQuantity + 1)}
              disabled={isPending || optimisticQuantity >= max}
              aria-label={`Increase quantity of ${line.product.name}`}
              className="text-fg-muted hover:text-fg flex h-full w-9 items-center justify-center rounded-r-full transition-colors disabled:opacity-40"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            className="text-fg-muted hover:text-fg text-xs underline underline-offset-4 transition-colors"
          >
            Remove
          </button>
        </div>

        {/* Stock problems are shown on the line that caused them, not as a
            toast that disappears before it can be acted on. */}
        {line.exceedsStock && !error && (
          <p className="text-danger text-xs">
            Only {line.product.stock_quantity} left — reduce the quantity to
            check out.
          </p>
        )}

        {error && (
          <p className="text-danger text-xs" role="alert">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}
