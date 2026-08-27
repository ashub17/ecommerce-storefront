import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/catalog";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Only publicly meaningful pages appear here.
 *
 * Cart, checkout, account and the auth screens are deliberately absent: they
 * are personal or transactional, carry `noindex`, and listing them would ask
 * crawlers to spend budget on pages that can never rank.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/products`, changeFrequency: "daily", priority: 0.9 },
  ];

  try {
    const [{ items: products }, categories] = await Promise.all([
      getProducts({ per_page: 60 }),
      getCategories(),
    ]);

    return [
      ...staticRoutes,
      ...categories.map((category) => ({
        url: `${SITE}/products?category=${category.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...products.map((product) => ({
        url: `${SITE}/products/${product.slug}`,
        lastModified: new Date(product.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    // A sitemap listing only the static routes beats a 500.
    return staticRoutes;
  }
}
