import Link from "next/link";
import { cn } from "@/lib/utils";
import { filtersToHref, type CatalogFilters } from "@/lib/filters";
import type { PaginationMeta } from "@/types/api";

/**
 * Real anchors rather than buttons, so pages are crawlable, middle-clickable
 * and openable in a new tab. Rendered on the server; no client JS involved.
 */
export function Pagination({
  meta,
  filters,
}: {
  meta: PaginationMeta;
  filters: CatalogFilters;
}) {
  if (meta.last_page <= 1) return null;

  const href = (page: number) => filtersToHref({ ...filters, page });
  const pages = pageWindow(meta.current_page, meta.last_page);

  return (
    <nav
      aria-label="Pagination"
      className="mt-16 flex items-center justify-center gap-1"
    >
      <PageLink
        href={href(meta.current_page - 1)}
        disabled={meta.current_page <= 1}
        label="Previous page"
      >
        ←
      </PageLink>

      {pages.map((page, index) =>
        page === null ? (
          <span
            key={`gap-${index}`}
            className="text-fg-subtle px-2 text-sm"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <PageLink
            key={page}
            href={href(page)}
            current={page === meta.current_page}
            label={`Page ${page}`}
          >
            {page}
          </PageLink>
        ),
      )}

      <PageLink
        href={href(meta.current_page + 1)}
        disabled={meta.current_page >= meta.last_page}
        label="Next page"
      >
        →
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  current = false,
  disabled = false,
  label,
}: {
  href: string;
  children: React.ReactNode;
  current?: boolean;
  disabled?: boolean;
  label: string;
}) {
  const className = cn(
    "inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm tabular-nums transition-colors",
    current
      ? "bg-primary text-primary-fg"
      : "text-fg-muted hover:bg-bg-subtle hover:text-fg",
    disabled && "pointer-events-none opacity-30",
  );

  if (disabled) {
    return (
      <span className={className} aria-hidden="true">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={className}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      scroll
    >
      {children}
    </Link>
  );
}

/** First, last, and a window around the current page; null marks a gap. */
function pageWindow(current: number, last: number): Array<number | null> {
  if (last <= 7) {
    return Array.from({ length: last }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, last, current]);

  for (const offset of [-1, 1]) {
    const page = current + offset;
    if (page > 1 && page < last) pages.add(page);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const output: Array<number | null> = [];

  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) output.push(null);
    output.push(page);
  });

  return output;
}
