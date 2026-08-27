import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ProductGrid } from "@/components/product/product-card";
import {
  getBanners,
  getCategories,
  getContentBlock,
  getProducts,
} from "@/lib/catalog";

export default async function HomePage() {
  // Independent reads, so they are issued together rather than in sequence.
  const [banners, featured, newest, categories, hero] = await Promise.all([
    getBanners().catch(() => []),
    getProducts({ featured: true, per_page: 8 }).catch(() => ({
      items: [],
      meta: null,
    })),
    getProducts({ sort: "newest", per_page: 4 }).catch(() => ({
      items: [],
      meta: null,
    })),
    getCategories().catch(() => []),
    getContentBlock("home-hero").catch(() => null),
  ]);

  const banner = banners[0];

  return (
    <>
      <section className="border-border border-b">
        <Container className="grid items-center gap-10 py-20 lg:grid-cols-2 lg:py-28">
          <div className="space-y-6">
            <h1 className="font-display text-4xl leading-[1.1] text-balance sm:text-5xl lg:text-6xl">
              {hero?.title ?? "Thoughtfully made everyday goods"}
            </h1>

            <p className="text-fg-muted max-w-md text-base leading-relaxed">
              {hero?.content ??
                "A small catalog of things we actually use, chosen for durability over novelty."}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <ButtonLink href="/products" size="lg">
                Shop everything
              </ButtonLink>

              {banner?.button_link && banner.button_text && (
                <ButtonLink
                  href={banner.button_link}
                  variant="secondary"
                  size="lg"
                >
                  {banner.button_text}
                </ButtonLink>
              )}
            </div>
          </div>

          {banner && (
            <div className="bg-bg-subtle relative aspect-[4/3] overflow-hidden rounded-xl">
              {banner.image_url ? (
                <Image
                  src={banner.image_url}
                  alt={banner.title}
                  fill
                  priority
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full flex-col justify-end p-8">
                  <p className="font-display text-2xl">{banner.title}</p>
                  {banner.subtitle && (
                    <p className="text-fg-muted mt-2 text-sm">
                      {banner.subtitle}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </Container>
      </section>

      {featured.items.length > 0 && (
        <Container className="py-20">
          <div className="mb-10 flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl sm:text-3xl">Featured</h2>
            <Link
              href="/products?featured=1"
              className="text-fg-muted hover:text-fg text-sm whitespace-nowrap transition-colors"
            >
              View all
            </Link>
          </div>

          <ProductGrid products={featured.items} />
        </Container>
      )}

      {categories.length > 0 && (
        <section className="border-border bg-bg-subtle border-y">
          <Container className="py-20">
            <h2 className="font-display mb-10 text-2xl sm:text-3xl">
              Browse by category
            </h2>

            <div className="grid gap-px overflow-hidden rounded-xl sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/products?category=${category.slug}`}
                  className="bg-surface hover:bg-bg group flex flex-col justify-between gap-8 p-8 transition-colors"
                >
                  <span className="font-display text-xl">{category.name}</span>
                  <span className="text-fg-subtle group-hover:text-fg text-sm transition-colors">
                    Shop →
                  </span>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}

      {newest.items.length > 0 && (
        <Container className="py-20">
          <div className="mb-10 flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl sm:text-3xl">New arrivals</h2>
            <Link
              href="/products?sort=newest"
              className="text-fg-muted hover:text-fg text-sm whitespace-nowrap transition-colors"
            >
              View all
            </Link>
          </div>

          <ProductGrid products={newest.items} />
        </Container>
      )}
    </>
  );
}
