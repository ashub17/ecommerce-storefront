"use client";

import * as Slider from "@radix-ui/react-slider";
import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/utils";
import { useFilters } from "@/hooks/use-filters";

/**
 * Dual-handle price range.
 *
 * Bounds come from the facets endpoint, which deliberately ignores the active
 * price filter — so the track stays still while it is being dragged instead of
 * collapsing onto the current selection.
 *
 * Dragging is local state; the URL is only written once the handle is
 * released, so a drag produces one navigation rather than one per pixel.
 */
export function PriceFilter({
  min,
  max,
  currency = "USD",
}: {
  min: number;
  max: number;
  currency?: string;
}) {
  const { filters, setFilters } = useFilters();

  const floor = Math.floor(min);
  const ceil = Math.ceil(max);

  const selected: [number, number] = [
    filters.minPrice ?? floor,
    filters.maxPrice ?? ceil,
  ];

  const [draft, setDraft] = useState<[number, number]>(selected);
  const dragging = useRef(false);

  // Keep the handles in step when the URL changes from elsewhere — a cleared
  // chip, the back button — but never while a drag is in progress.
  useEffect(() => {
    if (!dragging.current) {
      setDraft([filters.minPrice ?? floor, filters.maxPrice ?? ceil]);
    }
  }, [filters.minPrice, filters.maxPrice, floor, ceil]);

  if (ceil <= floor) {
    return null;
  }

  function commit(value: number[]) {
    dragging.current = false;

    const [low, high] = value as [number, number];

    setFilters({
      // Storing a bound equal to the catalog's own limit would add noise to the
      // URL without narrowing anything, so it is dropped.
      minPrice: low > floor ? low : null,
      maxPrice: high < ceil ? high : null,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Price</span>
        <span className="text-fg-muted text-xs tabular-nums">
          {formatMoney(draft[0], currency)} – {formatMoney(draft[1], currency)}
        </span>
      </div>

      <Slider.Root
        value={draft}
        min={floor}
        max={ceil}
        step={1}
        minStepsBetweenThumbs={1}
        onValueChange={(value) => {
          dragging.current = true;
          setDraft(value as [number, number]);
        }}
        onValueCommit={commit}
        className="relative flex h-5 w-full touch-none items-center select-none"
        aria-label="Price range"
      >
        <Slider.Track className="bg-border relative h-0.5 grow rounded-full">
          <Slider.Range className="bg-fg absolute h-full rounded-full" />
        </Slider.Track>

        <Slider.Thumb
          aria-label="Minimum price"
          className="border-fg bg-bg focus-visible:ring-ring block h-4 w-4 rounded-full border-2 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        />
        <Slider.Thumb
          aria-label="Maximum price"
          className="border-fg bg-bg focus-visible:ring-ring block h-4 w-4 rounded-full border-2 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        />
      </Slider.Root>
    </div>
  );
}
