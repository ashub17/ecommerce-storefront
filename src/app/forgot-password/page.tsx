import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-form";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <Container>
      <AuthShell
        title="Reset your password"
        subtitle="We'll email you a link to set a new one."
      >
        <ForgotPasswordForm />
      </AuthShell>
    </Container>
  );
}
