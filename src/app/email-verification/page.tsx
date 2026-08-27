import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Email verification",
  robots: { index: false, follow: false },
};

/** Mirrors the statuses the API redirects back with. */
const OUTCOMES: Record<string, { title: string; body: string }> = {
  verified: {
    title: "Email verified",
    body: "Thanks — your email address is confirmed.",
  },
  "already-verified": {
    title: "Already verified",
    body: "This address was confirmed previously. Nothing more to do.",
  },
  invalid: {
    title: "That link didn't work",
    body: "It may have expired or already been used. Request a new one from your account.",
  },
};

async function Outcome({
  searchParams,
}: Pick<PageProps<"/email-verification">, "searchParams">) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "invalid";
  const outcome = OUTCOMES[status] ?? OUTCOMES.invalid;

  return (
    <div className="text-center">
      <h1 className="font-display text-2xl">{outcome.title}</h1>
      <p className="text-fg-muted mt-3 text-sm leading-relaxed">
        {outcome.body}
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <ButtonLink href="/account">Go to account</ButtonLink>
        <ButtonLink href="/products" variant="secondary">
          Keep shopping
        </ButtonLink>
      </div>
    </div>
  );
}

export default function EmailVerificationPage(
  props: PageProps<"/email-verification">,
) {
  return (
    <Container>
      <div className="mx-auto w-full max-w-sm py-24">
        <Suspense fallback={<Skeleton className="h-40 w-full rounded-lg" />}>
          <Outcome searchParams={props.searchParams} />
        </Suspense>
      </div>
    </Container>
  );
}
