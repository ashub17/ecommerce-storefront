import "server-only";

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
 * Public data is cached and revalidated on a timer rather than fetched per
 * request: a storefront's catalog changes far less often than it is viewed.
 */

const CATALOG_REVALIDATE = 300; // seconds

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
  return apiList<Product>("products", {
    query: {
      ...query,
      featured: query.featured ? 1 : undefined,
      in_stock: query.in_stock ? 1 : undefined,
    },
    next: { revalidate: CATALOG_REVALIDATE, tags: ["products"] },
  });
}

export async function getProduct(slug: string): Promise<Product> {
  return apiItem<Product>(`products/${encodeURIComponent(slug)}`, {
    next: {
      revalidate: CATALOG_REVALIDATE,
      tags: ["products", `product:${slug}`],
    },
  });
}

export async function getRelatedProducts(
  slug: string,
  limit = 8,
): Promise<Product[]> {
  const { items } = await apiList<Product>(
    `products/${encodeURIComponent(slug)}/related`,
    {
      query: { limit },
      next: { revalidate: CATALOG_REVALIDATE, tags: ["products"] },
    },
  );

  return items;
}

export async function getCategories(tree = false): Promise<Category[]> {
  const { items } = await apiList<Category>("categories", {
    query: { tree: tree ? 1 : undefined },
    next: { revalidate: CATALOG_REVALIDATE, tags: ["categories"] },
  });

  return items;
}

export async function getFacets(
  query: Omit<ProductQuery, "sort" | "page" | "per_page"> = {},
): Promise<CatalogFacets> {
  return apiItem<CatalogFacets>("catalog/facets", {
    query: {
      ...query,
      featured: query.featured ? 1 : undefined,
      in_stock: query.in_stock ? 1 : undefined,
    },
    next: { revalidate: 60, tags: ["products", "categories"] },
  });
}

export async function getBanners(): Promise<Banner[]> {
  const { items } = await apiList<Banner>("banners", {
    next: { revalidate: CATALOG_REVALIDATE, tags: ["banners"] },
  });

  return items;
}

export async function getContentBlocks(): Promise<ContentBlock[]> {
  const { items } = await apiList<ContentBlock>("content-blocks", {
    next: { revalidate: CATALOG_REVALIDATE, tags: ["content"] },
  });

  return items;
}

/** Looks up one content block by key from the already-cached collection. */
export async function getContentBlock(
  key: string,
): Promise<ContentBlock | null> {
  const blocks = await getContentBlocks();

  return blocks.find((block) => block.key === key) ?? null;
}
