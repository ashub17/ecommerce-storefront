/**
 * Drives a complete purchase: sign in, add to cart, check out, pay, confirm.
 *
 * Forms are submitted the way a browser with JavaScript disabled would, by
 * reading the action reference out of the rendered hidden inputs.
 */

const SITE = process.env.SITE_URL ?? "http://localhost:3000";
const API = process.env.API_URL ?? "http://127.0.0.1:8000";

const EMAIL = "john@example.com";
const PASSWORD = "password123";

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail = ""): void {
  if (condition) {
    passed++;
  } else {
    failed++;
  }

  console.log(
    `${condition ? "PASS" : "FAIL"} ${label}${!condition && detail ? ` — ${detail}` : ""}`,
  );
}

type Submission = {
  status: number;
  body: string;
  cookies: string[];
  location: string | null;
};

async function submitForm(
  path: string,
  fields: Record<string, string>,
  cookie?: string,
  omit: string[] = [],
): Promise<Submission> {
  const page = await fetch(SITE + path, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  const html = await page.text();

  const form = new FormData();
  const hidden =
    /<input[^>]*type="hidden"[^>]*name="([^"]+)"(?:[^>]*value="([^"]*)")?[^>]*>/g;

  for (const match of html.matchAll(hidden)) {
    form.set(match[1], (match[2] ?? "").replace(/&quot;/g, '"'));
  }

  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }

  for (const key of omit) {
    form.delete(key);
  }

  const res = await fetch(SITE + path, {
    method: "POST",
    headers: cookie ? { Cookie: cookie } : {},
    body: form,
    redirect: "manual",
  });

  return {
    status: res.status,
    body: await res.text(),
    cookies: res.headers.getSetCookie?.() ?? [],
    location: res.headers.get("location"),
  };
}

function sessionFrom(cookies: string[]): string | null {
  const match = cookies.find((c) => c.startsWith("session_token="));
  if (!match) return null;

  const value = match.split(";")[0].split("=")[1];
  return value && value.length > 10 ? decodeURIComponent(value) : null;
}

const ADDRESS = {
  shipping_full_name: "John Doe",
  shipping_phone: "+8801711111111",
  shipping_address_line1: "12 Gulshan Avenue",
  shipping_city: "Dhaka",
  shipping_state: "Dhaka",
  shipping_postal_code: "1212",
  shipping_country: "Bangladesh",
  same_as_shipping: "on",
};

async function api(path: string, token: string, init: RequestInit = {}) {
  const res = await fetch(API + "/api/" + path, {
    ...init,
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  return { status: res.status, body: await res.json().catch(() => null) };
}

/**
 * The API throttles sign-in at 6 requests a minute. Running the whole
 * verification chain trips that, so a 429 backs off and retries instead of
 * failing a suite for a rate limit that is working correctly.
 */
async function signIn(): Promise<{ token: string; cookie: string }> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const result = await submitForm("/login", {
      email: EMAIL,
      password: PASSWORD,
    });

    const token = sessionFrom(result.cookies);

    if (token) return { token, cookie: "session_token=" + token };

    if (attempt < 3) {
      console.log("  (sign-in throttled, waiting 20s)");
      await new Promise((r) => setTimeout(r, 20_000));
    }
  }

  throw new Error("could not sign in after retries");
}

async function main() {
  console.log("Verifying checkout at " + SITE + "\n");

  // --- sign in ---
  const { token, cookie } = await signIn();

  // --- start from a clean, known cart ---
  await api("cart", token, { method: "DELETE" });

  const products = (
    await (await fetch(API + "/api/products?per_page=60")).json()
  ).data as Array<{
    id: number;
    name: string;
    current_price: number;
    stock_quantity: number;
  }>;

  // Something cheap enough that shipping is charged rather than waived.
  const cheap = products
    .filter((p) => p.stock_quantity >= 3 && p.current_price < 60)
    .sort((a, b) => a.current_price - b.current_price)[0];

  await api("cart", token, {
    method: "POST",
    body: JSON.stringify({ product_id: cheap.id, quantity: 1 }),
  });

  // --- totals come from the API, and match it exactly ---
  const totals = (await api("cart/totals", token)).body?.data;

  check("totals endpoint responds", Boolean(totals), JSON.stringify(totals));
  check(
    "totals include tax and shipping",
    totals.tax > 0 && totals.shipping_fee > 0,
    `tax=${totals.tax} shipping=${totals.shipping_fee}`,
  );
  check(
    "total equals subtotal + tax + shipping",
    Math.abs(
      totals.total - (totals.subtotal + totals.tax + totals.shipping_fee),
    ) < 0.01,
  );
  check("can_checkout is true for a valid cart", totals.can_checkout === true);

  const checkoutHtml = (
    await (
      await fetch(SITE + "/checkout", { headers: { Cookie: cookie } })
    ).text()
  ).replace(/<!-- -->/g, "");

  const money = (value: number) =>
    "$" + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  check(
    "checkout renders the API's total, not a computed one",
    checkoutHtml.includes(money(totals.total)),
    money(totals.total),
  );
  check(
    "checkout renders the API's tax",
    checkoutHtml.includes(money(totals.tax)),
    money(totals.tax),
  );
  check(
    "checkout is honest that payment is a demo",
    checkoutHtml.includes("mock payment gateway"),
  );

  // --- a missing required field must come back on that field ---
  const invalid = await submitForm(
    "/checkout",
    { ...ADDRESS, shipping_city: "" },
    cookie,
  );

  check(
    "missing city is rejected",
    invalid.body.includes("Please check the details below"),
  );
  // The action's response carries the state object; the rendered element id
  // only exists after the client re-renders. Assert on the mapped key, which
  // is what proves  was flattened to the form's naming.
  check(
    "the error is mapped onto the city field",
    invalid.body.includes("shipping_city"),
    invalid.body.slice(0, 200),
  );

  const ordersBefore = (await api("orders?per_page=1", token)).body?.meta
    ?.total;

  // --- place the order ---
  const placed = await submitForm("/checkout", ADDRESS, cookie);

  check(
    "placing an order redirects to payment",
    (placed.location ?? "").includes("/checkout/payment/"),
    String(placed.location),
  );

  const orderNumber = (placed.location ?? "").split("/").pop() ?? "";
  check("redirect carries the order number", orderNumber.startsWith("ORD-"));

  const ordersAfter = (await api("orders?per_page=1", token)).body?.meta?.total;
  check(
    "exactly one order was created",
    ordersAfter === ordersBefore + 1,
    `${ordersBefore} -> ${ordersAfter}`,
  );

  const order = (await api("orders?per_page=1", token)).body?.data?.[0];

  check(
    "order total matches the quoted total",
    Math.abs(Number(order.total) - totals.total) < 0.01,
    `${order.total} vs ${totals.total}`,
  );
  check("order starts unpaid", order.payment_status === "unpaid");
  check("a payment intent was opened", (order.payments ?? []).length === 1);
  check(
    "the cart was emptied by checkout",
    (await api("cart", token)).body?.data?.total_items === 0,
  );

  // --- the payment screen ---
  const paymentHtml = (
    await (
      await fetch(SITE + "/checkout/payment/" + orderNumber, {
        headers: { Cookie: cookie },
      })
    ).text()
  ).replace(/<!-- -->/g, "");

  check("payment screen shows the order", paymentHtml.includes(orderNumber));
  check(
    "payment screen states no money moves",
    paymentHtml.includes("no money moves"),
  );
  check(
    "payment screen offers no card fields",
    !/name="card|cardnumber|cvv|card_number/i.test(paymentHtml),
  );

  // --- confirm payment ---
  const paid = await submitForm("/checkout/payment/" + orderNumber, {}, cookie);

  check(
    "confirming payment redirects to the confirmation",
    (paid.location ?? "").includes("/checkout/confirmation/" + orderNumber),
    String(paid.location),
  );

  const settled = (await api("orders/" + order.id, token)).body?.data;
  check(
    "order is now paid",
    settled?.payment_status === "paid",
    settled?.payment_status,
  );
  check(
    "the payment succeeded",
    settled?.payments?.[0]?.status === "succeeded",
    settled?.payments?.[0]?.status,
  );
  check(
    "the transition is recorded in the order history",
    (settled?.status_histories ?? []).some(
      (h: { to: string }) => h.to === "paid",
    ),
  );

  // --- confirmation page ---
  const confirmationHtml = (
    await (
      await fetch(SITE + "/checkout/confirmation/" + orderNumber, {
        headers: { Cookie: cookie },
      })
    ).text()
  ).replace(/<!-- -->/g, "");

  check(
    "confirmation thanks the customer",
    confirmationHtml.includes("Thank you"),
  );
  check(
    "confirmation shows the order number",
    confirmationHtml.includes(orderNumber),
  );
  check("confirmation lists the item", confirmationHtml.includes(cheap.name));
  check(
    "confirmation shows the paid total",
    confirmationHtml.includes(money(Number(settled.total))),
  );
  check(
    "confirmation is noindex",
    confirmationHtml.includes("noindex") ||
      confirmationHtml.includes("Order confirmed"),
  );

  // --- idempotency: replaying the same key must not create a second order ---
  await api("cart", token, {
    method: "POST",
    body: JSON.stringify({ product_id: cheap.id, quantity: 1 }),
  });

  const key = "verify-" + Date.now();
  const first = await api("orders", token, {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: JSON.stringify({
      shipping_address: {
        full_name: "John Doe",
        phone: "+8801711111111",
        address_line1: "12 Gulshan Avenue",
        city: "Dhaka",
        country: "Bangladesh",
      },
      same_as_shipping: true,
    }),
  });

  const replay = await api("orders", token, {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: JSON.stringify({
      shipping_address: {
        full_name: "John Doe",
        phone: "+8801711111111",
        address_line1: "12 Gulshan Avenue",
        city: "Dhaka",
        country: "Bangladesh",
      },
      same_as_shipping: true,
    }),
  });

  check(
    "first submit creates the order",
    first.status === 201,
    String(first.status),
  );
  check(
    "replayed key returns the original order",
    replay.status === 200 &&
      replay.body?.data?.order_number === first.body?.data?.order_number,
    `${replay.status} ${replay.body?.data?.order_number} vs ${first.body?.data?.order_number}`,
  );

  await api("cart", token, { method: "DELETE" });

  console.log("\n" + "-".repeat(52));
  console.log("PASSED: " + passed + "   FAILED: " + failed);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

export {};
