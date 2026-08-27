import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Personal and transactional areas. Blocking them here saves crawl
      // budget; the pages also carry noindex, which is what actually keeps
      // them out of an index if they are reached another way.
      disallow: [
        "/account",
        "/cart",
        "/checkout",
        "/login",
        "/register",
        "/reset-password",
        "/forgot-password",
        "/email-verification",
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
