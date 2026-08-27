import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getCategories } from "@/lib/catalog";

/**
 * The header is a Server Component so the category nav is rendered from live
 * data with no client fetch and no layout shift.
 */
export async function SiteHeader() {
  const categories = await getCategories(true).catch(() => []);

  return (
    <header className="border-border bg-bg/85 sticky top-0 z-40 border-b backdrop-blur-sm">
      <Container className="flex h-16 items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="font-display text-lg tracking-tight whitespace-nowrap"
          >
            Aurora
          </Link>

          <nav aria-label="Categories" className="hidden md:block">
            <ul className="flex items-center gap-6">
              <li>
                <Link
                  href="/products"
                  className="text-fg-muted hover:text-fg text-sm transition-colors"
                >
                  All
                </Link>
              </li>
              {categories.slice(0, 5).map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/products?category=${category.slug}`}
                    className="text-fg-muted hover:text-fg text-sm whitespace-nowrap transition-colors"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <Link
            href="/account"
            className="text-fg-muted hover:text-fg hidden text-sm transition-colors sm:block"
          >
            Account
          </Link>

          <Link
            href="/cart"
            className="border-border hover:border-border-strong inline-flex h-9 items-center rounded-full border px-4 text-sm transition-colors"
          >
            Cart
          </Link>
        </div>
      </Container>
    </header>
  );
}
