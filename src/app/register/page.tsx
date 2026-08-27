import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-form";
import { RegisterForm } from "@/components/auth/register-form";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

async function RegisterView({
  searchParams,
}: Pick<PageProps<"/register">, "searchParams">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  return <RegisterForm next={next} />;
}

export default function RegisterPage(props: PageProps<"/register">) {
  return (
    <Container>
      <AuthShell title="Create an account" subtitle="Your cart comes with you.">
        <Suspense fallback={<Skeleton className="h-80 w-full rounded-lg" />}>
          <RegisterView searchParams={props.searchParams} />
        </Suspense>
      </AuthShell>
    </Container>
  );
}
