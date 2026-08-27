"use server";

import { redirect } from "next/navigation";
import { mergeGuestCart } from "@/app/actions/cart";
import { ApiError, apiFetch } from "@/lib/api";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth";
import { getSessionToken } from "@/lib/session";
import type { AuthResponse } from "@/types/api";
import { type AuthFormState } from "@/lib/form-state";

/** Flattens the API's `{field: [messages]}` into one message per field. */
function fieldErrors(error: ApiError): Record<string, string> {
  return Object.fromEntries(
    Object.entries(error.errors).map(([field, messages]) => [
      field,
      messages[0],
    ]),
  );
}

function failure(error: unknown, fallback: string): AuthFormState {
  if (error instanceof ApiError) {
    // The API throttles auth at 6/minute. Say so plainly — a bare "invalid
    // credentials" here would send people round in circles changing a password
    // that was never wrong.
    if (error.status === 429) {
      return {
        ok: false,
        message: "Too many attempts. Please wait a minute and try again.",
        errors: {},
      };
    }

    if (error.isValidationError) {
      return {
        ok: false,
        message: "Please check the details below.",
        errors: fieldErrors(error),
      };
    }

    return { ok: false, message: error.message || fallback, errors: {} };
  }

  return { ok: false, message: fallback, errors: {} };
}

/**
 * Only relative paths are honoured, so `?next=` cannot be used to bounce
 * someone to another site after they sign in.
 */
function safeRedirect(target: FormDataEntryValue | null): string {
  const value = typeof target === "string" ? target : "";

  return value.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

async function completeSignIn(token: string): Promise<string[]> {
  await setSessionCookie(token);

  // Fold the guest cart into the server cart. Tolerant by design: anything
  // that sold out meanwhile is reported rather than failing the sign-in.
  const notices = await mergeGuestCart(token);

  return notices;
}

export async function loginAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const destination = safeRedirect(formData.get("next"));

  let notices: string[] = [];

  try {
    const response = await apiFetch<AuthResponse>("auth/login", {
      method: "POST",
      body: {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      },
    });

    notices = await completeSignIn(response.token);
  } catch (error) {
    return failure(error, "Could not sign you in.");
  }

  // redirect() throws, so it must sit outside the try or it would be caught
  // and reported as a login failure.
  if (notices.length > 0) {
    redirect(`${destination}?notice=${encodeURIComponent(notices.join(" "))}`);
  }

  redirect(destination);
}

export async function registerAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const destination = safeRedirect(formData.get("next"));

  try {
    const response = await apiFetch<AuthResponse>("auth/register", {
      method: "POST",
      body: {
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        password_confirmation: String(
          formData.get("password_confirmation") ?? "",
        ),
      },
    });

    await completeSignIn(response.token);
  } catch (error) {
    return failure(error, "Could not create your account.");
  }

  redirect(destination);
}

export async function logoutAction(): Promise<void> {
  const token = await getSessionToken();

  if (token) {
    try {
      // Revoke server-side so the token is dead even if the cookie survives.
      await apiFetch("auth/logout", { method: "POST", token });
    } catch {
      // A failed revoke must not trap someone in a signed-in state.
    }
  }

  await clearSessionCookie();

  redirect("/");
}

export async function forgotPasswordAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  try {
    const response = await apiFetch<{ message: string }>(
      "auth/forgot-password",
      {
        method: "POST",
        body: { email: String(formData.get("email") ?? "") },
      },
    );

    // The API answers identically whether or not the address is registered,
    // so this endpoint cannot be used to enumerate users. Pass it through
    // unchanged rather than inventing a more specific message.
    return { ok: true, message: response.message, errors: {} };
  } catch (error) {
    return failure(error, "Could not send the reset link.");
  }
}

export async function resetPasswordAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  try {
    await apiFetch("auth/reset-password", {
      method: "POST",
      body: {
        token: String(formData.get("token") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        password_confirmation: String(
          formData.get("password_confirmation") ?? "",
        ),
      },
    });
  } catch (error) {
    return failure(error, "Could not reset your password.");
  }

  // A reset revokes every existing token server-side, so there is no session
  // to resume — sign in again with the new password.
  redirect("/login?reset=1");
}
