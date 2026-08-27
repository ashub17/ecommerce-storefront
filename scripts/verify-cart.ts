/**
 * Exercises the guest cart through the rendered /cart page.
 *
 * The cookie is written directly here rather than through the UI, which lets
 * the interesting cases be tested: a stale line, a deleted product, and a
 * cookie someone has edited by hand.
 */

const SITE = process.env.SITE_URL ?? "http://localhost:3000";
const API = process.env.API_URL ?? "http://127.0.0.1:8000";

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

type Line = { product_id: number; quantity: number; [key: string]: unknown };

async function loadCart(lines: Line[] | null) {
  const headers: Record<string, string> = {};

  if (lines) {
    headers.Cookie = `guest_cart=${encodeURIComponent(JSON.stringify(lines))}`;
  }

  const res = await fetch(`${SITE}/cart`, { headers });
  const html = await res.text();
  const text = html.replace(/<!-- -->/g, "");

  const money = [...text.matchAll(/\$([\d,]+\.\d{2})/g)].map((m) =>
    Number(m[1].replace(/,/g, "")),
  );

  return { status: res.status, html, text, money };
}

async function main() {
  console.log(`Verifying cart at ${SITE}\n`);

  const products = (
    await (
      await fetch(`${API}/api/products?per_page=60`, {
        headers: { Accept: "application/json" },
      })
    ).json()
  ).data as Array<{
    id: number;
    name: string;
    current_price: number;
    stock_quantity: number;
  }>;

  const a = products.find((p) => p.stock_quantity >= 5)!;
  const b = products.find((p) => p.id !== a.id && p.stock_quantity >= 5)!;

  // --- empty ---
  const empty = await loadCart(null);
  check("empty cart renders", empty.status === 200);
  check("empty state shown", empty.text.includes("Your cart is empty"));
  check("no checkout button when empty", !empty.text.includes(">Checkout<"));

  // --- one line ---
  const one = await loadCart([{ product_id: a.id, quantity: 2 }]);
  check("product name shown", one.text.includes(a.name), a.name);
  check(
    "line total is unit price x quantity",
    one.money.includes(Number((a.current_price * 2).toFixed(2))),
    `expected ${(a.current_price * 2).toFixed(2)} in ${one.money.join(", ")}`,
  );
  check("item count shown", one.text.includes("Subtotal (2 items)"));
  check("checkout available", one.text.includes("Checkout"));
  check("guest prompted to sign in", one.text.includes("to save your cart"));

  // --- two lines, subtotal is the sum ---
  const two = await loadCart([
    { product_id: a.id, quantity: 2 },
    { product_id: b.id, quantity: 1 },
  ]);
  const expectedSubtotal = Number(
    (a.current_price * 2 + b.current_price).toFixed(2),
  );
  check(
    "subtotal sums both lines",
    two.money.includes(expectedSubtotal),
    `expected ${expectedSubtotal} in ${two.money.join(", ")}`,
  );
  check("item count is 3", two.text.includes("Subtotal (3 items)"));

  // --- a price in the cookie must be ignored ---
  const tampered = await loadCart([
    { product_id: a.id, quantity: 1, price: 0.01, current_price: 0.01 },
  ]);
  check(
    "price in the cookie is ignored, API price wins",
    tampered.money.includes(Number(a.current_price.toFixed(2))) &&
      !tampered.money.includes(0.01),
    tampered.money.join(", "),
  );

  // --- quantity beyond stock is flagged and blocks checkout ---
  const over = await loadCart([
    { product_id: a.id, quantity: a.stock_quantity + 10 },
  ]);
  check(
    "over-stock line is flagged",
    over.text.includes(`Only ${a.stock_quantity} left`),
  );
  check(
    "checkout blocked while over stock",
    over.text.includes("Reduce the highlighted quantities"),
  );

  // --- junk cookies must not break the page ---
  const unknown = await loadCart([{ product_id: 999999, quantity: 1 }]);
  check(
    "unknown product silently drops out",
    unknown.status === 200 && unknown.text.includes("Your cart is empty"),
    String(unknown.status),
  );

  const malformed = await fetch(`${SITE}/cart`, {
    headers: { Cookie: "guest_cart=not-json-at-all" },
  });
  check(
    "malformed cookie does not error",
    malformed.status === 200,
    String(malformed.status),
  );

  const negative = await loadCart([{ product_id: a.id, quantity: -5 }]);
  check(
    "negative quantity is rejected",
    negative.text.includes("Your cart is empty"),
  );

  // --- the header badge tracks the cart ---
  const withCookie = await fetch(`${SITE}/`, {
    headers: {
      Cookie: `guest_cart=${encodeURIComponent(JSON.stringify([{ product_id: a.id, quantity: 3 }]))}`,
    },
  });
  const homeText = (await withCookie.text()).replace(/<!-- -->/g, "");
  // The drawer trigger announces the count on its aria-label, which is what a
  // screen reader reads out.
  check(
    "header badge announces the count",
    homeText.includes('aria-label="Cart, 3 items"'),
  );

  console.log(`\n${"-".repeat(52)}\nPASSED: ${passed}   FAILED: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

export {};
