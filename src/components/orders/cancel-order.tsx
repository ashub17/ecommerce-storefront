"use client";

import Link from "next/link";
import { useActionState } from "react";
import { cancelOrderAction } from "@/app/actions/checkout";
import { Button } from "@/components/ui/button";
import { EMPTY_CHECKOUT_STATE } from "@/lib/form-state";

/**
 * Cancelling is irreversible, so it asks first.
 *
 * The confirmation step is driven by a `?confirm=cancel` link rather than
 * client state, so the form is present in the server-rendered HTML and works
 * with JavaScript disabled — the same progressive-enhancement path every other
 * form in this app takes. Holding it behind `useState` meant the form existed
 * only after a click, so a no-JS visitor could never cancel at all.
 */
export function CancelOrder({
  orderId,
  confirming,
}: {
  orderId: number;
  confirming: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    cancelOrderAction,
    EMPTY_CHECKOUT_STATE,
  );

  if (state.ok) {
    return (
      <p role="status" className="text-success text-sm">
        {state.message}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {state.message && (
        <p role="alert" className="text-danger text-sm">
          {state.message}
        </p>
      )}

      {confirming ? (
        <form action={formAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="order_id" value={orderId} />

          <span className="text-fg-muted text-sm">Cancel this order?</span>

          <Button type="submit" variant="danger" size="sm" disabled={isPending}>
            {isPending ? "Cancelling…" : "Yes, cancel it"}
          </Button>

          <Link
            href={`/account/orders/${orderId}`}
            scroll={false}
            className="text-fg-muted hover:text-fg text-sm underline underline-offset-4"
          >
            Keep it
          </Link>
        </form>
      ) : (
        <Link
          href={`/account/orders/${orderId}?confirm=cancel`}
          scroll={false}
          className="border-border-strong hover:bg-bg-subtle inline-flex h-8 items-center justify-center rounded-full border px-3 text-xs font-medium transition-colors"
        >
          Cancel order
        </Link>
      )}
    </div>
  );
}
