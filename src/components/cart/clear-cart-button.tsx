"use client";

import { useState, useTransition } from "react";
import { clearCart } from "@/app/actions/cart";

/**
 * Emptying a cart is destructive and easy to hit by accident, so it asks once
 * inline rather than opening a dialog for a two-word question.
 */
export function ClearCartButton() {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-fg-muted hover:text-fg text-sm transition-colors"
      >
        Empty cart
      </button>
    );
  }

  return (
    <span className="flex items-center gap-3 text-sm">
      <span className="text-fg-muted">Empty the whole cart?</span>

      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(async () => void (await clearCart()))}
        className="text-danger underline underline-offset-4 disabled:opacity-50"
      >
        {isPending ? "Emptying…" : "Yes"}
      </button>

      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-fg-muted hover:text-fg underline underline-offset-4"
      >
        Cancel
      </button>
    </span>
  );
}
