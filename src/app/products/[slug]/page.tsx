import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/product/add-to-cart";
import { Price } from "@/components/product/price";
import { ProductCard } from "@/components/product/product-card";
import { ProductGallery } from "@/components/product/product-gallery";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { getProduct, getProducts, getRelatedProducts } from "@/lib/catalog";
import type { Product } from "@/types/api";

/**
 * Pre-renders the first page of the catalog at build time; anything else is
 * rendered on first request and then cached, so a growing catalog never slows
 * the build down.
 */
export async function generateStaticParams() {
  // Cache Components requires at least one param: an empty array errors,
  // because Next needs a real path to prerender and validate the shell
  // against. Paths not listed here are still served — they render on first
  // request and are cached from then on.
  const { items } = await getProducts({ per_page: 24 });

  return items.map((product) => ({ slug: product.slug }));
}

async function findProduct(slug: string): Promise<Product | null> {
  try {
    return await getProduct(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata(
  props: PageProps<"/products/[slug]">,
): Promise<Metadata> {
  // Next 16: params is a Promise.
  const { slug } = await props.params;
  const product = await findProduct(slug);

  if (!product) {
    // Under Cache Components the shell streams before the lookup resolves, so
    // an unknown slug answers 200 and the status can no longer be changed —
    // notFound() renders the right UI but cannot set the code. `noindex` is
    // the documented mitigation: it keeps this soft 404 out of search results.
    // A real 404 status would require checking the slug in proxy.ts, at the
    // cost of an API round trip on every product request.
    return {
      title: "Product not found",
      robots: { index: false, follow: false },
    };
  }

  const description =
    product.short_description ??
    product.description?.slice(0, 160) ??
    `Buy ${product.name} at Aurora.`;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description,
      url: `/products/${product.slug}`,
      images: product.featured_image_url
        ? [{ url: product.featured_image_url, alt: product.name }]
        : undefined,
    },
  };
}

async function ProductView({
  params,
}: Pick<PageProps<"/products/[slug]">, "params">) {
  const { slug } = await params;
  const product = await findProduct(slug);

  if (!product) {
    notFound();
  }

  const related = await getRelatedProducts(slug, 4).catch(() => []);

  const currency = "USD";
  const onSale =
    product.sale_price !== null &&
    Number(product.sale_price) < Number(product.price);

  /**
   * Structured data is what earns a rich result in search: price, currency and
   * stock state rendered for a crawler rather than inferred from the markup.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.short_description ?? product.description ?? undefined,
    sku: product.sku,
    image: product.featured_image_url ?? undefined,
    category: product.category?.name,
    offers: {
      "@type": "Offer",
      price: product.current_price,
      priceCurrency: currency,
      availability: product.in_stock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `/products/${product.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Serialised from our own data, not user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-fg-muted mb-10 text-sm">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/products" className="hover:text-fg transition-colors">
              Products
            </Link>
          </li>
          {product.category && (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={`/products?category=${product.category.slug}`}
                  className="hover:text-fg transition-colors"
                >
                  {product.category.name}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true">/</li>
          <li className="text-fg">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <ProductGallery product={product} />

        <div className="space-y-8 lg:pt-4">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {onSale && <Badge tone="accent">Sale</Badge>}
              {product.is_featured && <Badge>Featured</Badge>}
              {!product.in_stock && <Badge tone="danger">Sold out</Badge>}
            </div>

            <h1 className="font-display text-3xl leading-tight sm:text-4xl">
              {product.name}
            </h1>

            <Price product={product} currency={currency} size="lg" />

            {product.short_description && (
              <p className="text-fg-muted leading-relaxed">
                {product.short_description}
              </p>
            )}
          </div>

          <AddToCart product={product} />

          <dl className="border-border divide-border divide-y border-t text-sm">
            <div className="flex justify-between py-3">
              <dt className="text-fg-muted">SKU</dt>
              <dd className="font-mono text-xs">{product.sku}</dd>
            </div>
            {product.category && (
              <div className="flex justify-between py-3">
                <dt className="text-fg-muted">Category</dt>
                <dd>{product.category.name}</dd>
              </div>
            )}
            <div className="flex justify-between py-3">
              <dt className="text-fg-muted">Availability</dt>
              <dd>
                {product.in_stock
                  ? `${product.stock_quantity} in stock`
                  : "Out of stock"}
              </dd>
            </div>
          </dl>

          {product.description && (
            <details className="border-border group border-t pt-4" open>
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
                Description
                <span
                  aria-hidden="true"
                  className="text-fg-muted transition-transform group-open:rotate-180"
                >
                  ⌄
                </span>
              </summary>
              <p className="text-fg-muted mt-4 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </details>
          )}

          <details className="border-border group border-t pt-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
              Shipping &amp; returns
              <span
                aria-hidden="true"
                className="text-fg-muted transition-transform group-open:rotate-180"
              >
                ⌄
              </span>
            </summary>
            <p className="text-fg-muted mt-4 leading-relaxed">
              Orders ship within two business days. Free shipping on orders over
              $75. Returns accepted within 30 days of delivery.
            </p>
          </details>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="font-display mb-10 text-2xl">You might also like</h2>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/** Skeleton for the static shell, shown until the slug resolves. */
function ProductSkeleton() {
  return (
    <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="space-y-6 lg:pt-4">
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

export default function ProductPage(props: PageProps<"/products/[slug]">) {
  return (
    <Container className="py-12">
      <Suspense fallback={<ProductSkeleton />}>
        <ProductView params={props.params} />
      </Suspense>
    </Container>
  );
}
