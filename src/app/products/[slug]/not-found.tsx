import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/**
 * Rendered when a slug does not resolve to a product.
 *
 * `noindex` lives here rather than in the page's generateMetadata: calling
 * notFound() switches rendering to this boundary, and this boundary's metadata
 * is what ends up in the document.
 *
 * It matters because Cache Components streams the shell before the lookup
 * resolves, so the response has already committed to 200 and the status cannot
 * be changed. This is a soft 404 — the noindex is what keeps it out of search.
 */
export const metadata: Metadata = {
  title: "Product not found",
  robots: { index: false, follow: false },
};

export default function ProductNotFound() {
  return (
    <Container className="py-28">
      <div className="mx-auto max-w-md text-center">
        <p className="text-fg-subtle font-display text-5xl">404</p>

        <h1 className="font-display mt-4 text-2xl">
          We couldn&apos;t find that product
        </h1>

        <p className="text-fg-muted mt-3 text-sm leading-relaxed">
          It may have been removed, or the link might be wrong. The rest of the
          catalog is still here.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <ButtonLink href="/products">Browse all products</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Go home
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
