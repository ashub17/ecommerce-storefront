import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthShell } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

async function LoginView({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const justReset = params.reset === "1";

  return <LoginForm next={next} justReset={justReset} />;
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <Container>
      <AuthShell title="Sign in" subtitle="Welcome back.">
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
          <LoginView searchParams={props.searchParams} />
        </Suspense>
      </AuthShell>
    </Container>
  );
}
