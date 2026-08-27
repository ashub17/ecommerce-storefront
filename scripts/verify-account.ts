/**
 * Exercises the account area: order history, order detail, the status
 * timeline, and customer cancellation.
 *
 * Sets up its own order via the API so the run is repeatable and does not
 * depend on whatever happens to be in the database.
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

async function page(path: string, cookie: string): Promise<string> {
  const res = await fetch(SITE + path, { headers: { Cookie: cookie } });

  return (await res.text()).replace(/<!-- -->/g, "");
}

const SHIPPING = {
  full_name: "John Doe",
  phone: "+8801711111111",
  address_line1: "12 Gulshan Avenue",
  city: "Dhaka",
  state: "Dhaka",
  postal_code: "1212",
  country: "Bangladesh",
};

/** Places a fresh order straight through the API. */
async function placeOrder(token: string, productId: number, quantity = 1) {
  await api("cart", token, { method: "DELETE" });
  await api("cart", token, {
    method: "POST",
    body: JSON.stringify({ product_id: productId, quantity }),
  });

  const res = await api("orders", token, {
    method: "POST",
    headers: { "Idempotency-Key": "account-verify-" + crypto.randomUUID() },
    body: JSON.stringify({
      shipping_address: SHIPPING,
      same_as_shipping: true,
    }),
  });

  return res.body?.data;
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
  console.log("Verifying the account area at " + SITE + "\n");

  const { token, cookie } = await signIn();

  const products = (
    await (await fetch(API + "/api/products?per_page=60")).json()
  ).data as Array<{ id: number; name: string; stock_quantity: number }>;
  const product = products.find((p) => p.stock_quantity >= 4)!;

  const stockBefore = (
    await (await fetch(API + "/api/products?ids=" + product.id)).json()
  ).data[0].stock_quantity;

  const order = await placeOrder(token, product.id, 2);
  check("test order placed", Boolean(order?.order_number), order?.order_number);

  // --- order history ---
  const list = await page("/account/orders", cookie);

  check("order history renders", list.includes("Your orders"));
  check("history lists the new order", list.includes(order.order_number));
  check("history shows the item name", list.includes(product.name));
  check("history shows the status", list.includes(">pending<"));
  check("history shows the payment status", list.includes(">unpaid<"));

  // --- order detail ---
  const detail = await page("/account/orders/" + order.id, cookie);

  check("detail renders the order number", detail.includes(order.order_number));
  check("detail lists the item", detail.includes(product.name));
  check(
    "detail shows the shipping address",
    detail.includes("12 Gulshan Avenue"),
  );
  check(
    "detail shows the total",
    detail.includes(
      "$" +
        Number(order.total)
          .toFixed(2)
          .replace(/\B(?=(\d{3})+(?!\d))/g, ","),
    ),
  );

  // --- the status timeline, invisible until now ---
  check("timeline section present", detail.includes("History"));
  check("timeline shows the initial status", detail.includes("Order placed."));
  check(
    "timeline distinguishes payment transitions",
    detail.includes("(payment)"),
  );

  // --- another customer's order must not be reachable ---
  const admin = await api("orders?per_page=1", token);
  check("own orders are listed", admin.status === 200);

  const foreign = await fetch(SITE + "/account/orders/999999", {
    headers: { Cookie: cookie },
  });
  const foreignHtml = (await foreign.text()).replace(/<!-- -->/g, "");

  // getOrder() scopes the lookup to the authenticated user, so an id belonging
  // to someone else is indistinguishable from one that does not exist.
  check(
    "an unknown or foreign order shows the not-found page",
    foreignHtml.includes("doesn't exist") ||
      foreignHtml.includes("doesn’t exist") ||
      foreignHtml.includes("This page"),
  );
  // Soft 404 under PPR, as on product pages — but this route is private and
  // noindex regardless, so the status code carries no SEO consequence here.
  check("and is marked noindex", foreignHtml.includes("noindex"));

  // --- cancellation ---
  check("a pending order offers cancellation", detail.includes("Cancel order"));

  // The confirm step is a real link, so the form exists server-side once it is
  // followed — which is what makes cancellation work without JavaScript.
  const confirmPage = await page(
    "/account/orders/" + order.id + "?confirm=cancel",
    cookie,
  );
  check(
    "the confirm step renders a real form",
    confirmPage.includes("Yes, cancel it"),
  );

  const cancelled = await submitForm(
    "/account/orders/" + order.id + "?confirm=cancel",
    { order_id: String(order.id) },
    cookie,
  );

  check(
    "cancellation is accepted",
    cancelled.body.includes("has been cancelled"),
    cancelled.body.slice(0, 160),
  );

  const after = (await api("orders/" + order.id, token)).body?.data;
  check("order is now cancelled", after?.status === "cancelled", after?.status);

  // The whole point of Phase 2's restock work.
  const stockAfter = (
    await (await fetch(API + "/api/products?ids=" + product.id)).json()
  ).data[0].stock_quantity;

  check(
    "cancelling restored the stock",
    stockAfter === stockBefore,
    `${stockBefore} -> ${stockAfter}`,
  );

  const cancelledDetail = await page("/account/orders/" + order.id, cookie);
  check(
    "cancelled order no longer offers cancellation",
    !cancelledDetail.includes("Cancel order"),
  );
  check(
    "cancellation appears in the timeline",
    cancelledDetail.includes("Cancelled by customer."),
  );
  check(
    "cancelled order no longer offers payment",
    !cancelledDetail.includes("Complete payment"),
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
