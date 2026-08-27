"use client";

import { useFilters } from "@/hooks/use-filters";
import { hasActiveFilters } from "@/lib/filters";
import { formatMoney } from "@/lib/utils";
import type { CatalogFacets } from "@/types/api";

type Chip = { key: string; label: string; clear: () => void };

/**
 * Removable chips for every active filter.
 *
 * Without these, a customer who has scrolled past the sidebar has no way to
 * see why the result set is small, which is the usual cause of an empty
 * catalog that looks broken.
 */
export function ActiveFilters({
  categories,
}: {
  categories: CatalogFacets["categories"];
}) {
  const { filters, setFilters, toggleCategory, clearAll } = useFilters();

  if (!hasActiveFilters(filters)) return null;

  const nameBySlug = new Map(categories.map((c) => [c.slug, c.name]));

  const chips: Chip[] = [];

  if (filters.search) {
    chips.push({
      key: "search",
      label: `“${filters.search}”`,
      clear: () => setFilters({ search: "" }),
    });
  }

  for (const slug of filters.categories) {
    chips.push({
      key: `category:${slug}`,
      label: nameBySlug.get(slug) ?? slug,
      clear: () => toggleCategory(slug),
    });
  }

  if (filters.minPrice !== null || filters.maxPrice !== null) {
    const from =
      filters.minPrice !== null ? formatMoney(filters.minPrice) : "Any";
    const to =
      filters.maxPrice !== null ? formatMoney(filters.maxPrice) : "Any";

    chips.push({
      key: "price",
      label: `${from} – ${to}`,
      clear: () => setFilters({ minPrice: null, maxPrice: null }),
    });
  }

  if (filters.inStock) {
    chips.push({
      key: "in_stock",
      label: "In stock",
      clear: () => setFilters({ inStock: false }),
    });
  }

  if (filters.featured) {
    chips.push({
      key: "featured",
      label: "Featured",
      clear: () => setFilters({ featured: false }),
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.clear}
          className="border-border hover:border-border-strong hover:bg-bg-subtle group inline-flex items-center gap-1.5 rounded-full border py-1 pr-2 pl-3 text-xs transition-colors"
        >
          <span>{chip.label}</span>
          <span
            aria-hidden="true"
            className="text-fg-subtle group-hover:text-fg"
          >
            ×
          </span>
          <span className="sr-only">Remove filter</span>
        </button>
      ))}

      {chips.length > 1 && (
        <button
          type="button"
          onClick={clearAll}
          className="text-fg-muted hover:text-fg ml-1 text-xs underline underline-offset-4 transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
