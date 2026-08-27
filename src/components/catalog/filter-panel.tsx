"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { CategoryFilter } from "@/components/catalog/category-filter";
import { PriceFilter } from "@/components/catalog/price-filter";
import { useFilters } from "@/hooks/use-filters";
import { hasActiveFilters } from "@/lib/filters";
import type { CatalogFacets } from "@/types/api";

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="border-border-strong text-fg focus-visible:ring-ring h-4 w-4 rounded-sm"
      />
      {label}
    </label>
  );
}

function FilterFields({ facets }: { facets: CatalogFacets }) {
  const { filters, setFilters } = useFilters();

  return (
    <div className="space-y-8">
      <CategoryFilter categories={facets.categories} />

      <PriceFilter min={facets.price.min} max={facets.price.max} />

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">Availability</legend>
        <ToggleRow
          label="In stock only"
          checked={filters.inStock}
          onChange={(next) => setFilters({ inStock: next })}
        />
        <ToggleRow
          label="Featured only"
          checked={filters.featured}
          onChange={(next) => setFilters({ featured: next })}
        />
      </fieldset>
    </div>
  );
}

/** Sidebar on desktop. */
export function FilterSidebar({ facets }: { facets: CatalogFacets }) {
  return (
    <aside
      aria-label="Product filters"
      className="hidden w-56 shrink-0 lg:block"
    >
      <FilterFields facets={facets} />
    </aside>
  );
}

/**
 * Bottom sheet on mobile. Radix Dialog handles the focus trap, scroll lock,
 * Escape and `aria-modal` — all things a hand-rolled drawer usually gets wrong.
 */
export function FilterSheet({ facets }: { facets: CatalogFacets }) {
  const [open, setOpen] = useState(false);
  const { filters } = useFilters();
  const active = hasActiveFilters(filters);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="border-border hover:border-border-strong inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm transition-colors lg:hidden">
        Filters
        {active && (
          <span className="bg-fg h-1.5 w-1.5 rounded-full" aria-hidden="true" />
        )}
        {active && <span className="sr-only">(filters applied)</span>}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />

        <Dialog.Content className="bg-bg fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl p-6 pb-10">
          <div className="mb-6 flex items-center justify-between">
            <Dialog.Title className="font-display text-xl">
              Filters
            </Dialog.Title>
            <Dialog.Close className="text-fg-muted hover:text-fg text-sm transition-colors">
              Done
            </Dialog.Close>
          </div>

          <Dialog.Description className="sr-only">
            Narrow the product list by category, price and availability.
          </Dialog.Description>

          <FilterFields facets={facets} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
