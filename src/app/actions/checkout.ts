"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
import type { CheckoutFormState } from "@/lib/form-state";
import type { Order, Payment } from "@/types/api";

/**
 * Order placement.
 *
 * Everything about money and stock is decided by the API. This action's job is
 * to hand over the address, carry an idempotency key, and translate failures
 * into something a customer can act on.
 */

function fieldErrors(error: ApiError): Record<string, string> {
  return Object.fromEntries(
    Object.entries(error.errors).map(([field, messages]) => [
      field,
      messages[0],
    ]),
  );
}

/**
 * `OrderService::checkout()` reports stock and availability problems under the
 * `stock`, `product` and `cart` keys rather than against a form field. Those
 * are not fixable on this page, so they are surfaced as a message that sends
 * the customer back to the cart.
 */
const CART_LEVEL_KEYS = ["cart", "stock", "product"];

function cartProblem(error: ApiError): string | null {
  for (const key of CART_LEVEL_KEYS) {
    const message = error.errors[key]?.[0];
    if (message) return message;
  }

  return null;
}

function addressFrom(formData: FormData, prefix: string) {
  const value = (field: string) =>
    String(formData.get(`${prefix}_${field}`) ?? "").trim();

  return {
    full_name: value("full_name"),
    phone: value("phone"),
    address_line1: value("address_line1"),
    address_line2: value("address_line2") || null,
    city: value("city"),
    state: value("state") || null,
    postal_code: value("postal_code") || null,
    country: value("country"),
  };
}

export async function placeOrderAction(
  _previous: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const token = await getSessionToken();

  if (!token) {
    redirect("/login?next=/checkout");
  }

  const sameAsShipping = formData.get("same_as_shipping") === "on";

  // Generated once per checkout session by the form and submitted with it, so
  // a double-clicked button or a retry after a timeout cannot create a second
  // order. The API answers the replay with the original order.
  const idempotencyKey = String(formData.get("idempotency_key") ?? "");

  let order: Order;

  try {
    const response = await apiFetch<{ data: Order }>("orders", {
      method: "POST",
      token,
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
      body: {
        shipping_address: addressFrom(formData, "shipping"),
        same_as_shipping: sameAsShipping,
        ...(sameAsShipping
          ? {}
          : { billing_address: addressFrom(formData, "billing") }),
      },
    });

    order = response.data;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 409) {
        return {
          ok: false,
          message:
            "That order is already being placed. Give it a moment before trying again.",
          errors: {},
        };
      }

      if (error.isValidationError) {
        const problem = cartProblem(error);

        if (problem) {
          return {
            ok: false,
            message: problem,
            errors: {},
            returnToCart: true,
          };
        }

        return {
          ok: false,
          message: "Please check the details below.",
          // The API namespaces address fields as `shipping_address.city`;
          // flatten to the form's `shipping_city` naming.
          errors: Object.fromEntries(
            Object.entries(fieldErrors(error)).map(([field, message]) => [
              field
                .replace("shipping_address.", "shipping_")
                .replace("billing_address.", "billing_"),
              message,
            ]),
          ),
        };
      }
    }

    return {
      ok: false,
      message: "Could not place your order. Please try again.",
      errors: {},
    };
  }

  // Open a payment attempt straight away so the next screen has a reference to
  // work with. A failure here is not fatal — the order exists and can be paid
  // from the confirmation screen.
  try {
    await apiFetch<{ data: Payment }>("payments/intent", {
      method: "POST",
      token,
      body: { order_id: order.id },
    });
  } catch {
    // Deliberately ignored; the payment screen will create one if needed.
  }

  redirect(`/checkout/payment/${order.order_number}`);
}

/**
 * Asks the gateway for the authoritative state of a payment and applies it.
 *
 * The mock gateway settles immediately. A real one would return pending here
 * and confirm later by webhook — which the API already handles.
 */
export async function confirmPaymentAction(
  _previous: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const token = await getSessionToken();

  if (!token) {
    redirect("/login?next=/account/orders");
  }

  const reference = String(formData.get("reference") ?? "");
  const orderNumber = String(formData.get("order_number") ?? "");

  try {
    await apiFetch("payments/verify", {
      method: "POST",
      token,
      body: { reference },
    });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ApiError
          ? error.message
          : "Could not confirm that payment.",
      errors: {},
    };
  }

  redirect(`/checkout/confirmation/${orderNumber}`);
}

/**
 * Customer-initiated cancellation.
 *
 * The API decides whether an order may be cancelled (only from the statuses in
 * `commerce.orders.cancellable_from`) and restores stock as part of the same
 * transaction. This action just relays the outcome.
 */
export async function cancelOrderAction(
  _previous: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const token = await getSessionToken();

  if (!token) {
    redirect("/login?next=/account/orders");
  }

  const orderId = String(formData.get("order_id") ?? "");

  try {
    await apiFetch(`orders/${encodeURIComponent(orderId)}/cancel`, {
      method: "POST",
      token,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      // The API reports "cannot cancel" as a validation error on `status`.
      const reason = error.errors.status?.[0];

      return {
        ok: false,
        message: reason ?? error.message ?? "Could not cancel that order.",
        errors: {},
      };
    }

    return {
      ok: false,
      message: "Could not cancel that order.",
      errors: {},
    };
  }

  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);

  return { ok: true, message: "Your order has been cancelled.", errors: {} };
}
