import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-form";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
};

async function ResetView({
  searchParams,
}: Pick<PageProps<"/reset-password">, "searchParams">) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const email = typeof params.email === "string" ? params.email : "";

  // A link missing either half cannot succeed, so say so here rather than
  // letting the API reject a submission the form should never have offered.
  if (!token || !email) {
    return (
      <p className="text-fg-muted text-center text-sm">
        This reset link is incomplete or has expired.{" "}
        <Link
          href="/forgot-password"
          className="hover:text-fg underline underline-offset-4"
        >
          Request a new one
        </Link>
        .
      </p>
    );
  }

  return <ResetPasswordForm token={token} email={email} />;
}

export default function ResetPasswordPage(props: PageProps<"/reset-password">) {
  return (
    <Container>
      <AuthShell title="Set a new password">
        <Suspense fallback={<Skeleton className="h-72 w-full rounded-lg" />}>
          <ResetView searchParams={props.searchParams} />
        </Suspense>
      </AuthShell>
    </Container>
  );
}
