"use client";

import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions/auth";
import { AuthForm, Field } from "@/components/auth/auth-form";

export function ForgotPasswordForm() {
  return (
    <AuthForm
      action={forgotPasswordAction}
      submitLabel="Email me a link"
      pendingLabel="Sending…"
      footer={
        <p className="text-fg-muted text-center text-sm">
          <Link
            href="/login"
            className="hover:text-fg underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      {(state) => (
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          error={state.errors.email}
        />
      )}
    </AuthForm>
  );
}
