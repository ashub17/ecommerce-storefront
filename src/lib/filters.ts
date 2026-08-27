import { PRODUCT_SORTS, type ProductSort } from "@/types/api";

/**
 * The catalog's filter state lives entirely in the URL.
 *
 * That makes every filtered view shareable, bookmarkable, correct under the
 * back button, and renderable on the server. This module is the only place
 * that knows how to translate between the URL and the API's query parameters,
 * so the two can never drift apart.
 *
 * Categories travel as slugs because URLs are user-facing; the API wants ids,
 * and the mapping happens at the edge in `toApiQuery`.
 */

export const DEFAULT_SORT: ProductSort = "newest";
export const PER_PAGE = 12;

export type CatalogFilters = {
  search: string;
  /** Category slugs. */
  categories: string[];
  minPrice: number | null;
  maxPrice: number | null;
  inStock: boolean;
  featured: boolean;
  sort: ProductSort;
  page: number;
};

export const EMPTY_FILTERS: CatalogFilters = {
  search: "",
  categories: [],
  minPrice: null,
  maxPrice: null,
  inStock: false,
  featured: false,
  sort: DEFAULT_SORT,
  page: 1,
};

type ParamsLike =
  URLSearchParams | Record<string, string | string[] | undefined>;

function read(params: ParamsLike, key: string): string | undefined {
  if (params instanceof URLSearchParams) {
    return params.get(key) ?? undefined;
  }

  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function toNumber(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function isSort(value: string | undefined): value is ProductSort {
  return (
    value !== undefined && (PRODUCT_SORTS as readonly string[]).includes(value)
  );
}

export function parseFilters(params: ParamsLike): CatalogFilters {
  const categories = (read(params, "category") ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);

  const page = Number(read(params, "page") ?? 1);
  const sort = read(params, "sort");

  return {
    search: (read(params, "search") ?? "").trim(),
    categories,
    minPrice: toNumber(read(params, "min_price")),
    maxPrice: toNumber(read(params, "max_price")),
    inStock: read(params, "in_stock") === "1",
    featured: read(params, "featured") === "1",
    // An unrecognised sort falls back rather than 422-ing the API.
    sort: isSort(sort) ? sort : DEFAULT_SORT,
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
  };
}

/**
 * Serialises filters back to a query string, omitting anything at its default
 * so URLs stay short and one view has exactly one canonical URL.
 */
export function filtersToSearchParams(
  filters: CatalogFilters,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.categories.length)
    params.set("category", filters.categories.join(","));
  if (filters.minPrice !== null)
    params.set("min_price", String(filters.minPrice));
  if (filters.maxPrice !== null)
    params.set("max_price", String(filters.maxPrice));
  if (filters.inStock) params.set("in_stock", "1");
  if (filters.featured) params.set("featured", "1");
  if (filters.sort !== DEFAULT_SORT) params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));

  return params;
}

export function filtersToHref(filters: CatalogFilters): string {
  const query = filtersToSearchParams(filters).toString();

  return query ? `/products?${query}` : "/products";
}

/**
 * Translates filters into the API's parameters, resolving category slugs to
 * the ids the API expects.
 */
export function toApiQuery(
  filters: CatalogFilters,
  categoryIdBySlug: Map<string, number>,
) {
  const ids = filters.categories
    .map((slug) => categoryIdBySlug.get(slug))
    .filter((id): id is number => typeof id === "number");

  return {
    search: filters.search || undefined,
    category_id: ids.length ? ids.join(",") : undefined,
    min_price: filters.minPrice ?? undefined,
    max_price: filters.maxPrice ?? undefined,
    in_stock: filters.inStock,
    featured: filters.featured,
    sort: filters.sort,
    page: filters.page,
    per_page: PER_PAGE,
  };
}

/** True when anything other than sort and page is set. */
export function hasActiveFilters(filters: CatalogFilters): boolean {
  return Boolean(
    filters.search ||
    filters.categories.length ||
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.inStock ||
    filters.featured,
  );
}

export const SORT_LABELS: Record<ProductSort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  name_asc: "Name: A–Z",
  name_desc: "Name: Z–A",
};
