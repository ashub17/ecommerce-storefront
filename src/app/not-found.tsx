import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <Container className="py-28">
      <div className="mx-auto max-w-md text-center">
        <p className="text-fg-subtle font-display text-5xl">404</p>

        <h1 className="font-display mt-4 text-2xl">
          This page doesn&apos;t exist
        </h1>

        <p className="text-fg-muted mt-3 text-sm leading-relaxed">
          The link may be wrong or the page may have moved.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <ButtonLink href="/">Go home</ButtonLink>
          <ButtonLink href="/products" variant="secondary">
            Browse products
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
