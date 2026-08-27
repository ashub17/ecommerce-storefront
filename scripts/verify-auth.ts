/**
 * Exercises sign-in, the route guard, and merge-on-login.
 *
 * Next's Server Action forms are progressively enhanced: the rendered markup
 * carries the action reference and bound state in hidden inputs and posts
 * multipart back to the same URL. This script submits them exactly as a
 * browser with JavaScript disabled would, so it needs no action ids and keeps
 * working when the code changes — and it doubles as proof the forms work
 * without client JS at all.
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

  const hiddenInput =
    /<input[^>]*type="hidden"[^>]*name="([^"]+)"(?:[^>]*value="([^"]*)")?[^>]*>/g;

  for (const match of html.matchAll(hiddenInput)) {
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

  // Next url-encodes cookie values on write and decodes them on read, so the
  // raw header holds `20%7Cabc` where the Sanctum token is `20|abc`.
  return value && value.length > 10 ? decodeURIComponent(value) : null;
}

async function apiCart(token: string) {
  const res = await fetch(API + "/api/cart", {
    headers: { Authorization: "Bearer " + token, Accept: "application/json" },
  });

  return (await res.json()).data;
}

async function clearApiCart(token: string): Promise<void> {
  await fetch(API + "/api/cart", {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token, Accept: "application/json" },
  });
}

async function main() {
  console.log("Verifying auth at " + SITE + "\n");

  // --- route guard, before any session exists ---
  for (const guarded of ["/account", "/checkout"]) {
    const res = await fetch(SITE + guarded, { redirect: "manual" });
    const location = res.headers.get("location") ?? "";

    check(
      guarded + " redirects a signed-out visitor to /login",
      res.status >= 300 && res.status < 400 && location.includes("/login"),
      res.status + " -> " + location,
    );
    check(
      guarded + " preserves the destination in ?next=",
      location.includes("next=" + encodeURIComponent(guarded)),
      location,
    );
  }

  // --- sign in ---
  const login = await submitForm("/login", {
    email: EMAIL,
    password: PASSWORD,
  });

  const token = sessionFrom(login.cookies);
  check("sign-in sets a session cookie", token !== null);

  if (!token) {
    console.log("\nCannot continue without a session.");
    process.exit(1);
  }

  const rawCookie =
    login.cookies.find((c) => c.startsWith("session_token=")) ?? "";

  check("session cookie is HttpOnly", /HttpOnly/i.test(rawCookie), rawCookie);
  check("session cookie is SameSite=Lax", /SameSite=Lax/i.test(rawCookie));
  check("session cookie is scoped to /", /Path=\//i.test(rawCookie));
  check(
    "sign-in redirects onward",
    login.status >= 300 && login.status < 400,
    String(login.status),
  );

  const authCookie = "session_token=" + token;

  // --- the token must never reach the browser as readable markup ---
  const accountRes = await fetch(SITE + "/account", {
    headers: { Cookie: authCookie },
    redirect: "manual",
  });
  const accountHtml = (await accountRes.text()).replace(/<!-- -->/g, "");

  check(
    "the bearer token never appears in the HTML",
    !accountHtml.includes(token),
  );
  check(
    "signed-in visitor reaches /account",
    accountRes.status === 200,
    String(accountRes.status),
  );
  check("account shows the user's email", accountHtml.includes(EMAIL));
  check("account offers sign out", accountHtml.includes("Sign out"));

  // --- header reflects the session ---
  const homeHtml = await (
    await fetch(SITE + "/", { headers: { Cookie: authCookie } })
  ).text();
  check("header greets the user by first name", homeHtml.includes(">John<"));

  const signedOutHome = await (await fetch(SITE + "/")).text();
  check("signed-out header offers Sign in", signedOutHome.includes("Sign in"));
  // Scoped to the header: the footer keeps a Sign in link regardless, which
  // is a separate (and minor) UX question.
  const headerHtml = homeHtml.slice(0, homeHtml.indexOf("</header>"));
  check("signed-in header drops Sign in", !headerHtml.includes(">Sign in<"));

  // --- wrong password ---
  const bad = await submitForm("/login", {
    email: EMAIL,
    password: "definitely-wrong-password",
  });

  check(
    "wrong password does not create a session",
    sessionFrom(bad.cookies) === null,
  );
  check(
    "wrong password reports an error",
    bad.body.includes("Please check the details below") ||
      bad.body.toLowerCase().includes("credentials"),
  );

  // --- open redirect must be refused ---
  const evil = await submitForm("/login", {
    email: EMAIL,
    password: PASSWORD,
    next: "https://evil.example.com/steal",
  });

  check(
    "?next= cannot redirect off-site",
    !(evil.location ?? "").includes("evil.example.com"),
    String(evil.location),
  );

  // --- merge on login ---
  const products = (
    await (await fetch(API + "/api/products?per_page=5")).json()
  ).data as Array<{ id: number; name: string }>;
  const product = products[0];

  await clearApiCart(token);

  const guestCookie =
    "guest_cart=" +
    encodeURIComponent(
      JSON.stringify([{ product_id: product.id, quantity: 2 }]),
    );

  const merged = await submitForm(
    "/login",
    { email: EMAIL, password: PASSWORD },
    guestCookie,
  );

  const mergedToken = sessionFrom(merged.cookies) ?? token;
  const cart = await apiCart(mergedToken);

  check(
    "guest cart merged into the server cart on sign-in",
    cart?.total_items === 2,
    "total_items=" + cart?.total_items,
  );
  check(
    "merged line is the right product",
    cart?.items?.[0]?.product_id === product.id,
  );
  check(
    "guest cookie is cleared after merging",
    merged.cookies.some(
      (c) => c.startsWith("guest_cart=") && /guest_cart=;|Max-Age=0/i.test(c),
    ),
    merged.cookies.filter((c) => c.startsWith("guest_cart")).join(" | "),
  );

  // --- the signed-in cart now reads from the server ---
  const cartHtml = (
    await (
      await fetch(SITE + "/cart", {
        headers: { Cookie: "session_token=" + mergedToken },
      })
    ).text()
  ).replace(/<!-- -->/g, "");

  check(
    "signed-in cart renders the merged item",
    cartHtml.includes(product.name),
  );
  check(
    "signed-in cart drops the guest sign-in prompt",
    !cartHtml.includes("to save your cart"),
  );

  await clearApiCart(mergedToken);

  console.log("\n" + "-".repeat(52));
  console.log("PASSED: " + passed + "   FAILED: " + failed);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

export {};
