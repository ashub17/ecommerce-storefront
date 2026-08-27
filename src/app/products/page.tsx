import type { Metadata } from "next";
import { Suspense } from "react";
import { ActiveFilters } from "@/components/catalog/active-filters";
import { FilterSheet, FilterSidebar } from "@/components/catalog/filter-panel";
import { Pagination } from "@/components/catalog/pagination";
import { SearchInput } from "@/components/catalog/search-input";
import { SortSelect } from "@/components/catalog/sort-select";
import { ProductGrid } from "@/components/product/product-card";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategories, getFacets, getProducts } from "@/lib/catalog";
import { parseFilters, toApiQuery, type CatalogFilters } from "@/lib/filters";

export const metadata: Metadata = {
  title: "All products",
  description:
    "Browse the full catalog — filter by category, price and availability.",
  // Filters produce a combinatorial number of URLs that all show the same
  // catalog. Pointing them at one canonical stops that being read as
  // duplicate content, while the pages stay crawlable and shareable.
  alternates: { canonical: "/products" },
};

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="space-y-3">
          <Skeleton className="aspect-[4/5] w-full rounded-lg" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      ))}
    </div>
  );
}

/** Stands in for the whole catalog while searchParams resolve. */
function CatalogSkeleton() {
  return (
    <>
      <Skeleton className="h-4 w-24" />
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:justify-between">
        <Skeleton className="h-10 w-full sm:max-w-xs" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="mt-10 flex gap-12">
        <div className="hidden w-56 shrink-0 space-y-4 lg:block">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <GridSkeleton />
        </div>
      </div>
    </>
  );
}

/**
 * Results are their own async component so the filter chrome renders first and
 * only the grid suspends while the API is queried.
 */
async function Results({
  filters,
  query,
}: {
  filters: CatalogFilters;
  query: ReturnType<typeof toApiQuery>;
}) {
  const { items, meta } = await getProducts(query);

  if (items.length === 0) {
    return (
      <EmptyState
        title="No products match those filters"
        description="Try widening the price range or clearing a category."
        action={<ButtonLink href="/products">Clear all filters</ButtonLink>}
      />
    );
  }

  return (
    <>
      <ProductGrid products={items} />
      {meta && <Pagination meta={meta} filters={filters} />}
    </>
  );
}

/**
 * Everything downstream of searchParams.
 *
 * Cache Components requires request-time input to be awaited inside a Suspense
 * boundary, so the page above can still prerender a static shell.
 */
async function Catalog({
  searchParams,
}: Pick<PageProps<"/products">, "searchParams">) {
  const filters = parseFilters(await searchParams);

  // Category slugs are resolved to ids up front, so both the facets call and
  // the product query see the same filter set.
  const categories = await getCategories();
  const categoryIdBySlug = new Map(
    categories.map((category) => [category.slug, category.id]),
  );

  const query = toApiQuery(filters, categoryIdBySlug);

  // The category filter IS passed: the API excludes that dimension when
  // counting each category, but still applies it to `total`. Omitting it left
  // the headline reporting the whole catalog while the grid showed a subset.
  const facets = await getFacets({
    search: query.search,
    category_id: query.category_id,
    in_stock: filters.inStock,
    featured: filters.featured,
    min_price: query.min_price,
    max_price: query.max_price,
  });

  return (
    <>
      <p className="text-fg-muted text-sm">
        {facets.total} {facets.total === 1 ? "product" : "products"}
      </p>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput className="sm:max-w-xs sm:flex-1" />

        <div className="flex items-center gap-3">
          <FilterSheet facets={facets} />
          <SortSelect />
        </div>
      </div>

      <div className="mt-6">
        <ActiveFilters categories={facets.categories} />
      </div>

      <div className="mt-10 flex gap-12">
        <FilterSidebar facets={facets} />

        <div className="min-w-0 flex-1">
          {/* Re-keyed per filter combination so the skeleton returns for each
              new query rather than holding the previous results on screen. */}
          <Suspense key={JSON.stringify(filters)} fallback={<GridSkeleton />}>
            <Results filters={filters} query={query} />
          </Suspense>
        </div>
      </div>
    </>
  );
}

export default function ProductsPage(props: PageProps<"/products">) {
  return (
    <Container className="py-12">
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl">All products</h1>
      </header>

      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog searchParams={props.searchParams} />
      </Suspense>
    </Container>
  );
}
