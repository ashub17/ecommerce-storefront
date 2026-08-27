import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { apiItem, apiList } from "@/lib/api";
import type {
  Banner,
  CatalogFacets,
  Category,
  ContentBlock,
  PaginationMeta,
  Product,
  ProductSort,
} from "@/types/api";

/**
 * Server-side reads for the public catalog.
 *
 * With Cache Components enabled, data is dynamic unless a function opts in
 * with `use cache`. Each read below is cached and tagged, so it can be
 * invalidated by tag when the admin panel changes something rather than
 * waiting for a timer.
 */

export type ProductQuery = {
  search?: string;
  category_id?: string | number;
  ids?: string;
  featured?: boolean;
  in_stock?: boolean;
  min_price?: number | string;
  max_price?: number | string;
  sort?: ProductSort;
  page?: number;
  per_page?: number;
};

export async function getProducts(query: ProductQuery = {}): Promise<{
  items: Product[];
  meta: PaginationMeta | null;
}> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  return apiList<Product>("products", {
    query: {
      ...query,
      featured: query.featured ? 1 : undefined,
      in_stock: query.in_stock ? 1 : undefined,
    },
  });
}

export async function getProduct(slug: string): Promise<Product> {
  "use cache";
  cacheLife("hours");
  cacheTag("products", `product:${slug}`);

  return apiItem<Product>(`products/${encodeURIComponent(slug)}`);
}

export async function getRelatedProducts(
  slug: string,
  limit = 8,
): Promise<Product[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const { items } = await apiList<Product>(
    `products/${encodeURIComponent(slug)}/related`,
    { query: { limit } },
  );

  return items;
}

export async function getCategories(tree = false): Promise<Category[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");

  const { items } = await apiList<Category>("categories", {
    query: { tree: tree ? 1 : undefined },
  });

  return items;
}

export async function getFacets(
  query: Omit<ProductQuery, "sort" | "page" | "per_page"> = {},
): Promise<CatalogFacets> {
  "use cache";
  // Shorter than the catalog itself: facet counts move whenever stock does.
  cacheLife("minutes");
  cacheTag("products", "categories");

  return apiItem<CatalogFacets>("catalog/facets", {
    query: {
      ...query,
      featured: query.featured ? 1 : undefined,
      in_stock: query.in_stock ? 1 : undefined,
    },
  });
}

export async function getBanners(): Promise<Banner[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("banners");

  const { items } = await apiList<Banner>("banners");

  return items;
}

export async function getContentBlocks(): Promise<ContentBlock[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("content");

  const { items } = await apiList<ContentBlock>("content-blocks");

  return items;
}

/** Looks up one content block by key from the already-cached collection. */
export async function getContentBlock(
  key: string,
): Promise<ContentBlock | null> {
  const blocks = await getContentBlocks();

  return blocks.find((block) => block.key === key) ?? null;
}
