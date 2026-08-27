"use client";

import { useTransition } from "react";
import { logoutAction } from "@/app/actions/auth";

export function SignOutButton({ className }: { className?: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => logoutAction())}
      className={
        className ??
        "text-fg-muted hover:text-fg text-sm transition-colors disabled:opacity-50"
      }
    >
      {isPending ? "Signing out…" : "Sign out"}
    </button>
  );
}
