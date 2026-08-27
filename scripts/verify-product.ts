/**
 * Exercises the product detail page through its rendered HTML.
 *
 * Covers metadata, structured data, stock states and the breadcrumb — the
 * things a crawler and a customer each depend on, neither of which show up in
 * a type check.
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

async function load(path: string) {
  const res = await fetch(`${SITE}${path}`);
  const html = await res.text();

  return {
    status: res.status,
    html,
    /**
     * React separates adjacent expressions with `<!-- -->`, so
     * `Only {n} left` renders as `Only <!-- -->2<!-- --> left`. Stripping the
     * markers lets assertions match the text a reader actually sees.
     */
    text: html.replace(/<!-- -->/g, ""),
  };
}

function jsonLdFrom(html: string): Record<string, unknown> | null {
  // [\s\S] rather than the `s` flag, which needs an es2018 target.
  const match = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );

  if (!match) return null;

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

async function main() {
  console.log(`Verifying product pages at ${SITE}\n`);

  const apiRes = await fetch(`${API}/api/products?per_page=60`, {
    headers: { Accept: "application/json" },
  });
  const products = (await apiRes.json()).data as Array<{
    slug: string;
    name: string;
    sku: string;
    current_price: number;
    in_stock: boolean;
    stock_quantity: number;
    sale_price: string | null;
  }>;

  const onSale = products.find((p) => p.sale_price !== null)!;
  const plain = products.find((p) => p.sale_price === null)!;
  const lowStock = [...products].sort(
    (a, b) => a.stock_quantity - b.stock_quantity,
  )[0];

  // --- renders ---
  const page = await load(`/products/${plain.slug}`);
  check("product page renders", page.status === 200, String(page.status));
  check("shows the product name", page.html.includes(plain.name));
  check("shows the SKU", page.html.includes(plain.sku));
  check("breadcrumb present", page.html.includes('aria-label="Breadcrumb"'));
  check("add to cart present", page.html.includes("Add to cart"));
  check(
    "shipping section present",
    page.html.includes("Shipping &amp; returns"),
  );

  // --- metadata ---
  check(
    "title is the product name",
    page.html.includes(`<title>${plain.name} · Aurora</title>`),
    (page.html.match(/<title>[^<]*<\/title>/) ?? ["none"])[0],
  );
  check(
    "canonical url set",
    page.html.includes(
      `rel="canonical" href="http://localhost:3000/products/${plain.slug}"`,
    ),
  );
  check("og:title present", page.html.includes('property="og:title"'));

  // --- structured data ---
  const ld = jsonLdFrom(page.html);
  check("JSON-LD present", ld !== null);
  check(
    "JSON-LD is a Product",
    ld?.["@type"] === "Product",
    String(ld?.["@type"]),
  );
  check("JSON-LD carries the SKU", ld?.sku === plain.sku);

  const offer = ld?.offers as Record<string, unknown> | undefined;
  check("JSON-LD has an Offer", offer?.["@type"] === "Offer");
  check(
    "Offer price is the effective price",
    offer?.price === plain.current_price,
    `${offer?.price} vs ${plain.current_price}`,
  );
  check("Offer currency is USD", offer?.priceCurrency === "USD");
  check(
    "Offer availability reflects stock",
    offer?.availability ===
      (plain.in_stock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock"),
    String(offer?.availability),
  );

  // --- sale product uses the discounted price everywhere ---
  const salePage = await load(`/products/${onSale.slug}`);
  const saleLd = jsonLdFrom(salePage.html);
  const saleOffer = saleLd?.offers as Record<string, unknown> | undefined;
  check(
    "sale product JSON-LD quotes the sale price, not list",
    saleOffer?.price === onSale.current_price,
    `${saleOffer?.price} vs ${onSale.current_price}`,
  );
  check("sale badge rendered", salePage.html.includes(">Sale<"));
  check(
    "original price struck through",
    salePage.html.includes("line-through"),
  );

  // --- stock messaging ---
  const lowPage = await load(`/products/${lowStock.slug}`);
  if (lowStock.stock_quantity <= 5 && lowStock.stock_quantity > 0) {
    check(
      "low stock warning shown",
      lowPage.text.includes(`Only ${lowStock.stock_quantity} left in stock`),
      lowStock.slug,
    );
  } else {
    check("low stock case not applicable", true);
  }

  // --- related rail ---
  check(
    "related products rail rendered",
    page.html.includes("You might also like"),
  );

  // --- unknown slug ---
  const missing = await load("/products/definitely-not-real");
  check(
    "unknown slug returns 404",
    missing.status === 404,
    String(missing.status),
  );

  console.log(`\n${"-".repeat(52)}\nPASSED: ${passed}   FAILED: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

export {};
