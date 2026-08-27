import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

async function AccountView({
  searchParams,
}: Pick<PageProps<"/account">, "searchParams">) {
  const user = await getCurrentUser();

  // proxy.ts only checks that a cookie exists. A token that has since been
  // revoked gets here, so the real check happens once the user resolves.
  if (!user) {
    redirect("/login?next=/account");
  }

  const params = await searchParams;
  const notice = typeof params.notice === "string" ? params.notice : null;

  return (
    <>
      {/* Surfaced after sign-in when the cart merge could not honour a line
          in full — e.g. something sold out while they were browsing. */}
      {notice && (
        <p
          role="status"
          className="bg-accent-subtle text-accent mb-8 rounded-lg px-4 py-3 text-sm"
        >
          {notice}
        </p>
      )}

      <div className="border-border rounded-xl border p-6">
        <h2 className="font-display text-lg">Profile</h2>

        <dl className="divide-border mt-4 divide-y text-sm">
          <div className="flex justify-between py-3">
            <dt className="text-fg-muted">Name</dt>
            <dd>{user.name}</dd>
          </div>
          <div className="flex justify-between py-3">
            <dt className="text-fg-muted">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="flex justify-between py-3">
            <dt className="text-fg-muted">Email verified</dt>
            <dd>
              {user.email_verified_at ? (
                "Yes"
              ) : (
                <span className="text-fg-muted">Not yet</span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Link
          href="/account/orders"
          className="hover:text-fg-muted text-sm underline underline-offset-4 transition-colors"
        >
          Order history →
        </Link>

        <SignOutButton />
      </div>
    </>
  );
}

export default function AccountPage(props: PageProps<"/account">) {
  return (
    <Container className="py-12">
      <h1 className="font-display mb-10 text-3xl sm:text-4xl">Your account</h1>

      <div className="max-w-xl">
        <Suspense fallback={<Skeleton className="h-56 w-full rounded-xl" />}>
          <AccountView searchParams={props.searchParams} />
        </Suspense>
      </div>
    </Container>
  );
}
