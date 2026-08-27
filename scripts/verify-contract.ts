/**
 * Checks the API's live responses against the types in src/types/api.ts.
 *
 * A type declaration only describes what we believe the API sends. This asserts
 * it actually does, so drift is caught here rather than as an undefined deep in
 * a component. Run with: npx tsx scripts/verify-contract.ts
 */

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
    `${condition ? "PASS" : "FAIL"} ${label}${detail && !condition ? ` — ${detail}` : ""}`,
  );
}

function hasKeys(obj: unknown, keys: string[]): string | null {
  if (obj === null || typeof obj !== "object") return "not an object";
  const missing = keys.filter((k) => !(k in (obj as object)));
  return missing.length ? `missing: ${missing.join(", ")}` : null;
}

/**
 * Deliberately loose: this script's whole purpose is to inspect raw, untyped
 * JSON and assert what is actually in it. Typing it against src/types/api.ts
 * would assume the very thing being verified.
 */
type RawJson = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function get(path: string): Promise<RawJson> {
  const res = await fetch(`${API}/api/${path}`, {
    headers: { Accept: "application/json" },
  });

  return res.json() as Promise<RawJson>;
}

async function main() {
  console.log(`Verifying contract against ${API}\n`);

  // --- envelope ---
  const products = await get("products?per_page=2");
  check(
    "products: envelope has message/data/meta",
    !hasKeys(products, ["message", "data", "meta"]),
  );
  check("products: data is an array", Array.isArray(products.data));
  check(
    "products: meta shape",
    !hasKeys(products.meta, ["current_page", "last_page", "per_page", "total"]),
    hasKeys(products.meta, [
      "current_page",
      "last_page",
      "per_page",
      "total",
    ]) ?? "",
  );

  const product = products.data[0];
  const productKeys = [
    "id",
    "category_id",
    "name",
    "slug",
    "sku",
    "short_description",
    "description",
    "price",
    "sale_price",
    "current_price",
    "stock_quantity",
    "in_stock",
    "featured_image",
    "featured_image_url",
    "is_active",
    "is_featured",
    "category",
    "images",
    "created_at",
    "updated_at",
  ];
  check(
    "Product: all fields present",
    !hasKeys(product, productKeys),
    hasKeys(product, productKeys) ?? "",
  );
  check(
    "Product: price is a string (decimal cast)",
    typeof product.price === "string",
    typeof product.price,
  );
  check(
    "Product: current_price is a number",
    typeof product.current_price === "number",
    typeof product.current_price,
  );
  check(
    "Product: in_stock is a boolean",
    typeof product.in_stock === "boolean",
  );
  check("Product: no deleted_at leaked", !("deleted_at" in product));

  // --- single resource ---
  const single = await get(`products/${product.slug}`);
  check(
    "single product: data is an object not array",
    !Array.isArray(single.data) && typeof single.data === "object",
  );
  check("single product: no meta key", single.meta === undefined);

  // --- categories ---
  const cats = await get("categories");
  const cat = cats.data[0];
  check(
    "Category: fields present",
    !hasKeys(cat, [
      "id",
      "name",
      "slug",
      "description",
      "image",
      "image_url",
      "parent_id",
      "is_active",
    ]),
    hasKeys(cat, [
      "id",
      "name",
      "slug",
      "image_url",
      "parent_id",
      "is_active",
    ]) ?? "",
  );
  const tree = await get("categories?tree=1");
  check(
    "Category tree: children array present",
    Array.isArray(tree.data[0]?.children),
  );

  // --- facets ---
  const facets = await get("catalog/facets");
  check(
    "Facets: shape",
    !hasKeys(facets.data, ["price", "categories", "total", "sorts"]),
    hasKeys(facets.data, ["price", "categories", "total", "sorts"]) ?? "",
  );
  check(
    "Facets: price bounds numeric",
    typeof facets.data.price.min === "number" &&
      typeof facets.data.price.max === "number",
  );
  check(
    "Facets: sorts is a string array",
    Array.isArray(facets.data.sorts) &&
      typeof facets.data.sorts[0] === "string",
  );
  check(
    "Facets: sorts matches PRODUCT_SORTS",
    JSON.stringify(facets.data.sorts.slice().sort()) ===
      JSON.stringify([
        "name_asc",
        "name_desc",
        "newest",
        "oldest",
        "price_asc",
        "price_desc",
      ]),
    JSON.stringify(facets.data.sorts),
  );
  const facetCat = facets.data.categories[0];
  check(
    "Facets: category counts",
    !hasKeys(facetCat, ["id", "name", "slug", "parent_id", "products_count"]),
  );

  // --- related ---
  const related = await get(`products/${product.slug}/related`);
  check(
    "Related: data is an array, no meta",
    Array.isArray(related.data) && related.meta === undefined,
  );

  // --- banners / content blocks ---
  const banners = await get("banners");
  check(
    "Banner: fields present",
    banners.data.length === 0 ||
      !hasKeys(banners.data[0], [
        "id",
        "title",
        "subtitle",
        "button_text",
        "button_link",
        "image_url",
        "is_active",
        "sort_order",
      ]),
  );
  const blocks = await get("content-blocks");
  check(
    "ContentBlock: fields present",
    blocks.data.length === 0 ||
      !hasKeys(blocks.data[0], [
        "id",
        "key",
        "title",
        "content",
        "image_url",
        "meta",
        "is_active",
      ]),
  );

  // --- error shapes ---
  const notFound = await fetch(
    `${API}/api/products/definitely-not-a-real-slug`,
    { headers: { Accept: "application/json" } },
  );
  const notFoundBody = await notFound.json();
  check(
    "404 carries a message",
    notFound.status === 404 && typeof notFoundBody.message === "string",
  );

  const badSort = await fetch(`${API}/api/products?sort=bogus`, {
    headers: { Accept: "application/json" },
  });
  const badSortBody = await badSort.json();
  check(
    "422 carries message + errors",
    badSort.status === 422 && !hasKeys(badSortBody, ["message", "errors"]),
  );

  const unauth = await fetch(`${API}/api/cart`, {
    headers: { Accept: "application/json" },
  });
  check("401 on protected route", unauth.status === 401);

  console.log(`\n${"-".repeat(50)}\nPASSED: ${passed}   FAILED: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

export {};
