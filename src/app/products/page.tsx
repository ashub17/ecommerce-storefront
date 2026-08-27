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

/**
 * Results are their own async component so the filters render immediately and
 * only this subtree suspends while the API is queried.
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

export default async function ProductsPage(props: PageProps<"/products">) {
  // Next 16: searchParams is a Promise and must be awaited.
  const searchParams = await props.searchParams;
  const filters = parseFilters(searchParams);

  // Category slugs are resolved to ids up front, so both the facets call and
  // the product query see the same filter set.
  const categories = await getCategories();
  const categoryIdBySlug = new Map(
    categories.map((category) => [category.slug, category.id]),
  );

  const query = toApiQuery(filters, categoryIdBySlug);

  // Facets are fetched here rather than inside Results so the sidebar renders
  // straight away instead of suspending along with the grid.
  //
  // The category filter IS passed: the API excludes that dimension when
  // counting each category, but still applies it to `total`. Omitting it here
  // left the headline reporting the whole catalog while the grid showed a
  // filtered subset.
  const facets = await getFacets({
    search: query.search,
    category_id: query.category_id,
    in_stock: filters.inStock,
    featured: filters.featured,
    min_price: query.min_price,
    max_price: query.max_price,
  });

  // Re-keying on the query makes React show the fallback again for each new
  // filter combination rather than holding the previous results on screen.
  const suspenseKey = JSON.stringify(filters);

  return (
    <Container className="py-12">
      <header className="mb-10 space-y-3">
        <h1 className="font-display text-3xl sm:text-4xl">All products</h1>
        <p className="text-fg-muted text-sm">
          {facets.total} {facets.total === 1 ? "product" : "products"}
        </p>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          <Suspense key={suspenseKey} fallback={<GridSkeleton />}>
            <Results filters={filters} query={query} />
          </Suspense>
        </div>
      </div>
    </Container>
  );
}
