"use client";

import { useFilters } from "@/hooks/use-filters";
import { SORT_LABELS } from "@/lib/filters";
import { PRODUCT_SORTS, type ProductSort } from "@/types/api";

/**
 * A native <select>. A custom listbox would need focus management, typeahead
 * and mobile handling to match what the platform already gives away here, and
 * the minimal styling suits it.
 */
export function SortSelect() {
  const { filters, setFilters } = useFilters();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="catalog-sort" className="text-fg-muted text-sm">
        Sort
      </label>

      <select
        id="catalog-sort"
        value={filters.sort}
        onChange={(event) =>
          setFilters({ sort: event.target.value as ProductSort })
        }
        className="border-border bg-surface focus:border-border-strong h-9 rounded-full border px-3 text-sm transition-colors focus:outline-none"
      >
        {PRODUCT_SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {SORT_LABELS[sort]}
          </option>
        ))}
      </select>
    </div>
  );
}
