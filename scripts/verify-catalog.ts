/**
 * Exercises the catalog's filters through the rendered page.
 *
 * Requests real URLs and inspects the server-rendered HTML, so this checks the
 * whole path — URL parsing, slug-to-id mapping, the API call and the markup —
 * without a browser in the way.
 */

const SITE = process.env.SITE_URL ?? "http://localhost:3000";

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

  const names = [
    ...html.matchAll(
      /class="text-fg group-hover:text-fg-muted[^"]*">([^<]*)</g,
    ),
  ].map((m) => m[1].trim());

  // React separates adjacent expressions with <!-- -->, so the headline
  // renders as `16<!-- --> <!-- -->products` rather than `16 products`.
  const countMatch = html.match(
    /text-fg-muted text-sm">(\d+)<!-- -->\s*<!-- -->products?/,
  );

  return {
    status: res.status,
    html,
    names,
    productCount: names.length,
    /** The headline total, which comes from the facets endpoint. */
    reportedTotal: countMatch ? Number(countMatch[1]) : null,
  };
}

async function main() {
  console.log(`Verifying catalog at ${SITE}\n`);

  // --- baseline ---
  const all = await load("/products");
  check("/products renders", all.status === 200);
  check(
    "first page shows 12 of 16",
    all.productCount === 12,
    String(all.productCount),
  );
  check(
    "headline total is 16",
    all.reportedTotal === 16,
    String(all.reportedTotal),
  );
  check("pagination rendered", all.html.includes('aria-label="Pagination"'));

  // --- sorting ---
  const asc = await load("/products?sort=price_asc");
  const desc = await load("/products?sort=price_desc");
  check(
    "price_asc starts with the cheapest",
    asc.names[0] === "Organic Cotton Tee",
    asc.names[0],
  );
  check(
    "price_desc starts with the dearest",
    desc.names[0] === "Wireless Noise Cancelling Headphones",
    desc.names[0],
  );
  check(
    "asc and desc are genuinely different orders",
    asc.names[0] !== desc.names[0],
  );

  const nameAsc = await load("/products?sort=name_asc");
  check(
    "name_asc is alphabetical",
    nameAsc.names[0] === "4K Webcam With Ring Light",
    nameAsc.names[0],
  );

  // --- category by slug ---
  const books = await load("/products?category=books");
  check(
    "category=books returns 3",
    books.productCount === 3,
    String(books.productCount),
  );
  check(
    "category=books total is 3",
    books.reportedTotal === 3,
    String(books.reportedTotal),
  );

  const multi = await load("/products?category=books,apparel");
  check(
    "multi-category returns 3+4=7",
    multi.productCount === 7,
    String(multi.productCount),
  );

  const bogus = await load("/products?category=not-a-real-category");
  check(
    "unknown category slug is ignored, not a crash",
    bogus.status === 200 && bogus.productCount === 12,
    `${bogus.status} / ${bogus.productCount}`,
  );

  // --- price ---
  const cheap = await load("/products?max_price=50");
  check(
    "max_price=50 narrows the set",
    cheap.reportedTotal !== null && cheap.reportedTotal < 16,
    String(cheap.reportedTotal),
  );
  check(
    "max_price uses effective price (discounted book included)",
    cheap.names.includes("Designing Data Intensive Applications"),
    cheap.names.join(", "),
  );

  const band = await load("/products?min_price=100&max_price=150");
  check(
    "price band returns 4",
    band.reportedTotal === 4,
    String(band.reportedTotal),
  );

  // --- search ---
  const search = await load("/products?search=kettle");
  check(
    "search with no matches shows the empty state",
    search.html.includes("No products match those filters"),
  );

  const cotton = await load("/products?search=cotton");
  check(
    "search=cotton finds 1",
    cotton.productCount === 1,
    String(cotton.productCount),
  );

  // --- toggles ---
  const featured = await load("/products?featured=1");
  check(
    "featured=1 narrows the set",
    featured.reportedTotal !== null &&
      featured.reportedTotal > 0 &&
      featured.reportedTotal < 16,
    String(featured.reportedTotal),
  );

  // --- combined ---
  const combo = await load(
    "/products?category=electronics&sort=price_desc&in_stock=1",
  );
  check(
    "combined filters apply together",
    combo.status === 200 && combo.productCount > 0 && combo.productCount <= 5,
    String(combo.productCount),
  );

  // --- chips and pagination ---
  check("active filter chips render", combo.html.includes("Remove filter"));
  const page2 = await load("/products?page=2");
  check(
    "page 2 returns the remaining 4",
    page2.productCount === 4,
    String(page2.productCount),
  );
  check(
    "page 2 marks itself current",
    page2.html.includes('aria-current="page"'),
  );

  // --- malformed input must not 500 ---
  const junk = await load("/products?sort=DROP+TABLE&page=-5&min_price=abc");
  check(
    "malformed params fall back safely",
    junk.status === 200 && junk.productCount === 12,
    `${junk.status} / ${junk.productCount}`,
  );

  console.log(`\n${"-".repeat(52)}\nPASSED: ${passed}   FAILED: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

export {};
