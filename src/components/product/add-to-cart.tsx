"use client";

import { useState, useTransition } from "react";
import { addToCart, type CartActionResult } from "@/app/actions/cart";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types/api";

export function AddToCart({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const [result, setResult] = useState<CartActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const max = Math.max(1, product.stock_quantity);
  const soldOut = !product.in_stock;

  function submit() {
    startTransition(async () => {
      setResult(await addToCart(product.slug, quantity));
    });
  }

  if (soldOut) {
    return (
      <div className="space-y-3">
        <Button disabled className="w-full" size="lg">
          Sold out
        </Button>
        <p className="text-fg-muted text-sm">
          This product is currently unavailable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="border-border inline-flex h-12 items-center rounded-full border">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="text-fg-muted hover:text-fg flex h-full w-11 items-center justify-center rounded-l-full text-lg transition-colors disabled:opacity-30"
          >
            −
          </button>

          <input
            type="number"
            inputMode="numeric"
            aria-label="Quantity"
            value={quantity}
            min={1}
            max={max}
            onChange={(event) => {
              const next = Number(event.target.value);
              // Clamped to real stock, so the control cannot express a
              // quantity the server will reject.
              setQuantity(
                Number.isFinite(next) ? Math.min(Math.max(1, next), max) : 1,
              );
            }}
            className="h-full w-12 [appearance:textfield] border-0 bg-transparent text-center text-sm tabular-nums focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />

          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(max, q + 1))}
            disabled={quantity >= max}
            aria-label="Increase quantity"
            className="text-fg-muted hover:text-fg flex h-full w-11 items-center justify-center rounded-r-full text-lg transition-colors disabled:opacity-30"
          >
            +
          </button>
        </div>

        <Button
          onClick={submit}
          disabled={isPending}
          size="lg"
          className="flex-1"
        >
          {isPending ? "Adding…" : "Add to cart"}
        </Button>
      </div>

      {/* aria-live so the outcome is announced, not just shown. */}
      <p
        aria-live="polite"
        className={
          result
            ? result.ok
              ? "text-success text-sm"
              : "text-danger text-sm"
            : "sr-only"
        }
      >
        {result?.message ?? ""}
      </p>

      {product.stock_quantity <= 5 && (
        <p className="text-fg-muted text-sm">
          Only {product.stock_quantity} left in stock.
        </p>
      )}
    </div>
  );
}
