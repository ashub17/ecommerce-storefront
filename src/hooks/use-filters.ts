"use client";

import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  EMPTY_FILTERS,
  filtersToSearchParams,
  parseFilters,
  type CatalogFilters,
} from "@/lib/filters";

/**
 * Reads catalog filters from the URL and writes changes back to it.
 *
 * Two behaviours matter here:
 *
 * - Changing any filter resets to page 1. Without it, narrowing a result set
 *   while on page 5 lands the customer on an empty page.
 * - Updates use `replace`, not `push`, so adjusting a slider does not bury the
 *   previous page under dozens of history entries. `scroll: false` keeps the
 *   viewport where it is while results refresh underneath.
 */
export function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const apply = useCallback(
    (next: CatalogFilters) => {
      const query = filtersToSearchParams(next).toString();

      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router],
  );

  /** Patches one or more fields; resets to page 1 unless page is the change. */
  const setFilters = useCallback(
    (patch: Partial<CatalogFilters>) => {
      const isPageChange = "page" in patch && Object.keys(patch).length === 1;

      apply({
        ...filters,
        ...patch,
        page: isPageChange ? (patch.page ?? 1) : 1,
      });
    },
    [apply, filters],
  );

  const toggleCategory = useCallback(
    (slug: string) => {
      const next = filters.categories.includes(slug)
        ? filters.categories.filter((s) => s !== slug)
        : [...filters.categories, slug];

      setFilters({ categories: next });
    },
    [filters.categories, setFilters],
  );

  /** Clears filters but keeps the chosen sort, which is a display preference. */
  const clearAll = useCallback(() => {
    apply({ ...EMPTY_FILTERS, sort: filters.sort });
  }, [apply, filters.sort]);

  return { filters, setFilters, toggleCategory, clearAll, isPending };
}
