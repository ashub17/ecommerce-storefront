"use client";

import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { AuthForm, Field } from "@/components/auth/auth-form";

export function LoginForm({
  next,
  justReset = false,
}: {
  next?: string;
  justReset?: boolean;
}) {
  return (
    <>
      {justReset && (
        <p
          role="status"
          className="bg-success/10 text-success mb-5 rounded-lg px-3 py-2.5 text-sm"
        >
          Your password has been reset. Sign in with your new password.
        </p>
      )}

      <AuthForm
        action={loginAction}
        submitLabel="Sign in"
        pendingLabel="Signing in…"
        footer={
          <div className="text-fg-muted space-y-2 text-center text-sm">
            <p>
              <Link
                href="/forgot-password"
                className="hover:text-fg underline underline-offset-4"
              >
                Forgot your password?
              </Link>
            </p>
            <p>
              New here?{" "}
              <Link
                href={
                  next
                    ? `/register?next=${encodeURIComponent(next)}`
                    : "/register"
                }
                className="hover:text-fg underline underline-offset-4"
              >
                Create an account
              </Link>
            </p>
          </div>
        }
      >
        {(state) => (
          <>
            {next && <input type="hidden" name="next" value={next} />}
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
              autoComplete="current-password"
              error={state.errors.password}
            />
          </>
        )}
      </AuthForm>
    </>
  );
}
