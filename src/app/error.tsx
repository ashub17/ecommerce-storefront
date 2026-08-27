"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/**
 * Segment-level error boundary.
 *
 * Shows what can be acted on and nothing else: the digest identifies the
 * server-side error in logs without exposing a stack trace to the visitor.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="py-28">
      <div className="mx-auto max-w-md text-center">
        <p className="text-fg-subtle font-display text-5xl">Oh dear</p>

        <h1 className="font-display mt-4 text-2xl">Something went wrong</h1>

        <p className="text-fg-muted mt-3 text-sm leading-relaxed">
          This page failed to load. Trying again often works — the catalog
          itself is fine.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/products" variant="secondary">
            Browse products
          </ButtonLink>
        </div>

        {error.digest && (
          <p className="text-fg-subtle mt-8 font-mono text-xs">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </Container>
  );
}
