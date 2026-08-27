"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { EMPTY_FORM_STATE, type AuthFormState } from "@/lib/form-state";

type Action = (
  state: AuthFormState,
  formData: FormData,
) => Promise<AuthFormState>;

export function Field({
  label,
  name,
  type = "text",
  error,
  required = true,
  autoComplete,
  defaultValue,
  readOnly = false,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string;
  readOnly?: boolean;
  hint?: string;
}) {
  const id = `field-${name}`;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>

      <input
        id={id}
        name={name}
        type={type}
        required={required}
        readOnly={readOnly}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`border-border bg-surface focus:border-border-strong h-11 w-full rounded-lg border px-3 text-sm transition-colors focus:outline-none ${
          error ? "border-danger" : ""
        } ${readOnly ? "text-fg-muted" : ""}`}
      />

      {hint && !error && (
        <p id={`${id}-hint`} className="text-fg-muted text-xs">
          {hint}
        </p>
      )}

      {/* Errors are tied to the input with aria-describedby, so a screen
          reader announces the reason rather than just "invalid". */}
      {error && (
        <p id={`${id}-error`} className="text-danger text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

export function AuthForm({
  action,
  submitLabel,
  pendingLabel,
  children,
  footer,
}: {
  action: Action;
  submitLabel: string;
  pendingLabel: string;
  children: (state: AuthFormState) => React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [state, formAction, isPending] = useActionState(
    action,
    EMPTY_FORM_STATE,
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={`rounded-lg px-3 py-2.5 text-sm ${
            state.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          }`}
        >
          {state.message}
        </p>
      )}

      {children(state)}

      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {isPending ? pendingLabel : submitLabel}
      </Button>

      {footer}
    </form>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-sm py-20">
      <div className="mb-8 text-center">
        <Link href="/" className="font-display text-lg">
          Aurora
        </Link>
        <h1 className="font-display mt-6 text-2xl">{title}</h1>
        {subtitle && <p className="text-fg-muted mt-2 text-sm">{subtitle}</p>}
      </div>

      {children}
    </div>
  );
}
