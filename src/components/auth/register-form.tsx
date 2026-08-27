"use client";

import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import { AuthForm, Field } from "@/components/auth/auth-form";

export function RegisterForm({ next }: { next?: string }) {
  return (
    <AuthForm
      action={registerAction}
      submitLabel="Create account"
      pendingLabel="Creating account…"
      footer={
        <p className="text-fg-muted text-center text-sm">
          Already have an account?{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="hover:text-fg underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      }
    >
      {(state) => (
        <>
          {next && <input type="hidden" name="next" value={next} />}
          <Field
            label="Name"
            name="name"
            autoComplete="name"
            error={state.errors.name}
          />
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            error={state.errors.email}
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters."
            error={state.errors.password}
          />
          <Field
            label="Confirm password"
            name="password_confirmation"
            type="password"
            autoComplete="new-password"
            error={state.errors.password_confirmation}
          />
        </>
      )}
    </AuthForm>
  );
}
