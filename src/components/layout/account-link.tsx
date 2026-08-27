import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

/**
 * Reads the session, so it lives behind its own Suspense boundary alongside
 * the cart badge — request-time data outside one would block the static shell.
 */
export async function AccountLink() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link
        href="/login"
        className="text-fg-muted hover:text-fg hidden text-sm transition-colors sm:block"
      >
        Sign in
      </Link>
    );
  }

  // Just the first name: a header is not the place for a full email address.
  const firstName = user.name.split(" ")[0];

  return (
    <Link
      href="/account"
      className="text-fg-muted hover:text-fg hidden text-sm transition-colors sm:block"
    >
      {firstName}
    </Link>
  );
}

export function AccountLinkFallback() {
  return (
    <span className="text-fg-subtle hidden text-sm sm:block" aria-hidden="true">
      Account
    </span>
  );
}
