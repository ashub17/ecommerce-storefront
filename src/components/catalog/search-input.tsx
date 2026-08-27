"use client";

import { useEffect, useRef, useState } from "react";
import { useFilters } from "@/hooks/use-filters";

/**
 * Search box synced to `?search=`.
 *
 * Typing updates local state immediately so the field never feels laggy, and
 * the URL is written on a debounce so a ten-character query is one navigation
 * rather than ten.
 */
export function SearchInput({ className }: { className?: string }) {
  const { filters, setFilters } = useFilters();
  const [value, setValue] = useState(filters.search);

  // Tracks what this component last pushed, so an external change to the URL
  // (a cleared chip, the back button) can be told apart from our own echo.
  const lastPushed = useRef(filters.search);

  useEffect(() => {
    if (filters.search !== lastPushed.current) {
      lastPushed.current = filters.search;
      setValue(filters.search);
    }
  }, [filters.search]);

  useEffect(() => {
    if (value === filters.search) return;

    const timer = setTimeout(() => {
      lastPushed.current = value;
      setFilters({ search: value });
    }, 350);

    return () => clearTimeout(timer);
  }, [value, filters.search, setFilters]);

  return (
    <div className={className}>
      <label htmlFor="catalog-search" className="sr-only">
        Search products
      </label>

      <input
        id="catalog-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search products"
        autoComplete="off"
        className="border-border bg-surface placeholder:text-fg-subtle focus:border-border-strong h-10 w-full rounded-full border px-4 text-sm transition-colors focus:outline-none"
      />
    </div>
  );
}
