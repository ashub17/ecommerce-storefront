"use client";

import { useActionState } from "react";
import { confirmPaymentAction } from "@/app/actions/checkout";
import { Button } from "@/components/ui/button";
import { EMPTY_CHECKOUT_STATE } from "@/lib/form-state";

/**
 * The mock gateway's confirmation step.
 *
 * Presented honestly as a demo rather than as a card form: a realistic-looking
 * card field that processes nothing invites someone to type a real number into
 * it. The underlying flow — intent, capture, webhook — is the real one.
 */
export function ConfirmPayment({
  reference,
  orderNumber,
}: {
  reference: string;
  orderNumber: string;
}) {
  const [state, formAction, isPending] = useActionState(
    confirmPaymentAction,
    EMPTY_CHECKOUT_STATE,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="order_number" value={orderNumber} />

      {state.message && (
        <p
          role="alert"
          className="bg-danger/10 text-danger rounded-lg px-4 py-3 text-sm"
        >
          {state.message}
        </p>
      )}

      <div className="border-border bg-bg-subtle rounded-lg border p-5 text-sm">
        <p className="font-medium">Mock gateway</p>
        <p className="text-fg-muted mt-2 leading-relaxed">
          No card details are collected and no money moves. Confirming runs the
          same capture the API would perform against a real provider.
        </p>
        <p className="text-fg-subtle mt-3 font-mono text-xs break-all">
          {reference}
        </p>
      </div>

      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {isPending ? "Confirming…" : "Confirm payment"}
      </Button>
    </form>
  );
}
