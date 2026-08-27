import Link from "next/link";
import { cacheLife } from "next/cache";
import { Container } from "@/components/ui/container";
import { getContentBlock } from "@/lib/catalog";

/**
 * The year is read through a cached function rather than inline.
 *
 * Under Cache Components an inline `new Date()` cannot be prerendered — the
 * value would be frozen at build time and silently wrong every January. Caching
 * it with a daily life keeps the shell static while the year still refreshes.
 */
async function currentYear(): Promise<number> {
  "use cache";
  cacheLife("days");

  return new Date().getFullYear();
}

export async function SiteFooter() {
  const year = await currentYear();
  const about = await getContentBlock("about-us").catch(() => null);

  return (
    <footer className="border-border mt-24 border-t">
      <Container className="grid gap-10 py-14 sm:grid-cols-3">
        <div className="space-y-3">
          <p className="font-display text-lg">Aurora</p>
          {about?.content && (
            <p className="text-fg-muted max-w-xs text-sm leading-relaxed">
              {about.content}
            </p>
          )}
        </div>

        <nav aria-label="Shop">
          <p className="mb-3 text-xs tracking-wide uppercase">Shop</p>
          <ul className="text-fg-muted space-y-2 text-sm">
            <li>
              <Link
                href="/products"
                className="hover:text-fg transition-colors"
              >
                All products
              </Link>
            </li>
            <li>
              <Link
                href="/products?featured=1"
                className="hover:text-fg transition-colors"
              >
                Featured
              </Link>
            </li>
            <li>
              <Link
                href="/products?sort=newest"
                className="hover:text-fg transition-colors"
              >
                New arrivals
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Account">
          <p className="mb-3 text-xs tracking-wide uppercase">Account</p>
          <ul className="text-fg-muted space-y-2 text-sm">
            <li>
              <Link href="/login" className="hover:text-fg transition-colors">
                Sign in
              </Link>
            </li>
            <li>
              <Link
                href="/account/orders"
                className="hover:text-fg transition-colors"
              >
                Orders
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-fg transition-colors">
                Cart
              </Link>
            </li>
          </ul>
        </nav>
      </Container>

      <Container className="border-border border-t py-6">
        <p className="text-fg-subtle text-xs">
          © {year} Aurora. A demonstration storefront.
        </p>
      </Container>
    </footer>
  );
}
