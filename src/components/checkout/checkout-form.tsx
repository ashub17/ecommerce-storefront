"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { placeOrderAction } from "@/app/actions/checkout";
import { Field } from "@/components/auth/auth-form";
import { Button } from "@/components/ui/button";
import { EMPTY_CHECKOUT_STATE } from "@/lib/form-state";
import type { User } from "@/types/api";

/**
 * Checkout as one page with sections, not a multi-route wizard.
 *
 * Fewer navigations, nothing lost on refresh, and every field stays reachable
 * for correction after a validation error — which a wizard makes painful.
 */

function Section({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border border-t py-8 first:border-t-0 first:pt-0">
      <h2 className="mb-5 flex items-center gap-3 text-sm font-medium">
        <span className="bg-bg-subtle text-fg-muted flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums">
          {step}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function AddressFields({
  prefix,
  errors,
  defaultName,
}: {
  prefix: "shipping" | "billing";
  errors: Record<string, string>;
  defaultName?: string;
}) {
  const field = (name: string) => `${prefix}_${name}`;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field
          label="Full name"
          name={field("full_name")}
          autoComplete={`${prefix} name`}
          defaultValue={defaultName}
          error={errors[field("full_name")]}
        />
      </div>

      <Field
        label="Phone"
        name={field("phone")}
        type="tel"
        autoComplete={`${prefix} tel`}
        error={errors[field("phone")]}
      />

      <Field
        label="Country"
        name={field("country")}
        autoComplete={`${prefix} country-name`}
        defaultValue="Bangladesh"
        error={errors[field("country")]}
      />

      <div className="sm:col-span-2">
        <Field
          label="Address"
          name={field("address_line1")}
          autoComplete={`${prefix} address-line1`}
          error={errors[field("address_line1")]}
        />
      </div>

      <div className="sm:col-span-2">
        <Field
          label="Apartment, suite, etc."
          name={field("address_line2")}
          required={false}
          autoComplete={`${prefix} address-line2`}
          error={errors[field("address_line2")]}
        />
      </div>

      <Field
        label="City"
        name={field("city")}
        autoComplete={`${prefix} address-level2`}
        error={errors[field("city")]}
      />

      <Field
        label="State / region"
        name={field("state")}
        required={false}
        autoComplete={`${prefix} address-level1`}
        error={errors[field("state")]}
      />

      <Field
        label="Postal code"
        name={field("postal_code")}
        required={false}
        autoComplete={`${prefix} postal-code`}
        error={errors[field("postal_code")]}
      />
    </div>
  );
}

export function CheckoutForm({
  user,
  idempotencyKey,
}: {
  user: User;
  idempotencyKey: string;
}) {
  const [state, formAction, isPending] = useActionState(
    placeOrderAction,
    EMPTY_CHECKOUT_STATE,
  );

  const [sameAsShipping, setSameAsShipping] = useState(true);

  return (
    <form action={formAction} className="space-y-2" noValidate>
      <input type="hidden" name="idempotency_key" value={idempotencyKey} />

      {state.message && (
        <div
          role="alert"
          className="bg-danger/10 text-danger mb-6 rounded-lg px-4 py-3 text-sm"
        >
          <p>{state.message}</p>

          {/* Stock and availability problems cannot be fixed from this page. */}
          {state.returnToCart && (
            <p className="mt-2">
              <Link href="/cart" className="underline underline-offset-4">
                Return to your cart
              </Link>{" "}
              to adjust it.
            </p>
          )}
        </div>
      )}

      <Section step={1} title="Contact">
        <Field
          label="Email"
          name="email"
          type="email"
          defaultValue={user.email}
          readOnly
          error={state.errors.email}
        />
      </Section>

      <Section step={2} title="Shipping address">
        <AddressFields
          prefix="shipping"
          errors={state.errors}
          defaultName={user.name}
        />
      </Section>

      <Section step={3} title="Billing address">
        <label className="mb-5 flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="same_as_shipping"
            checked={sameAsShipping}
            onChange={(event) => setSameAsShipping(event.target.checked)}
            className="border-border-strong text-fg h-4 w-4 rounded-sm"
          />
          Same as shipping address
        </label>

        {!sameAsShipping && (
          <AddressFields prefix="billing" errors={state.errors} />
        )}
      </Section>

      <Section step={4} title="Payment">
        <div className="border-border bg-bg-subtle rounded-lg border p-5">
          <p className="text-sm font-medium">Demo payment</p>
          <p className="text-fg-muted mt-2 text-sm leading-relaxed">
            This store runs a mock payment gateway. No card details are
            collected and no money moves. You will confirm the payment on the
            next screen, which exercises the same intent, capture and webhook
            flow a real provider would.
          </p>
        </div>
      </Section>

      <div className="border-border border-t pt-8">
        <Button type="submit" size="lg" disabled={isPending} className="w-full">
          {isPending ? "Placing order…" : "Place order"}
        </Button>

        <p className="text-fg-subtle mt-4 text-center text-xs">
          Your order is created before payment, so nothing is lost if the
          payment step is interrupted.
        </p>
      </div>
    </form>
  );
}
