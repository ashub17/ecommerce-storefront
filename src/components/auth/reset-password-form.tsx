"use client";

import { resetPasswordAction } from "@/app/actions/auth";
import { AuthForm, Field } from "@/components/auth/auth-form";

/**
 * The token and email arrive in the emailed link's query string. They are
 * submitted back unchanged — the API is what validates them.
 */
export function ResetPasswordForm({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  return (
    <AuthForm
      action={resetPasswordAction}
      submitLabel="Set new password"
      pendingLabel="Saving…"
    >
      {(state) => (
        <>
          <input type="hidden" name="token" value={token} />
          <Field
            label="Email"
            name="email"
            type="email"
            defaultValue={email}
            readOnly
            error={state.errors.email}
          />
          <Field
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters."
            error={state.errors.password}
          />
          <Field
            label="Confirm new password"
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
