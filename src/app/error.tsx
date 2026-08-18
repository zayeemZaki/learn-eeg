"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/**
 * Root error boundary. Catches errors thrown while rendering a Server/Client
 * Component below it (e.g. requireUser()/requireAdmin() throwing "Unauthorized"
 * from a render path) and redirects cleanly to /login instead of showing a
 * crash screen — a deleted or demoted account should bounce to sign-in, not
 * dead-end here.
 *
 * Any other error still shows a plain fallback with a retry action; only the
 * "Unauthorized" message triggers the redirect.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const isUnauthorized = error.message === "Unauthorized";

  useEffect(() => {
    if (isUnauthorized) router.replace("/login");
  }, [isUnauthorized, router]);

  // Not a blank screen while the redirect runs: a visible, announced line so the
  // moment is legible to everyone, including screen-reader users.
  if (isUnauthorized) {
    return (
      <div
        role="status"
        className="flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center"
      >
        <p className="text-lg font-semibold text-[var(--foreground)]">Signing you out…</p>
        <p className="text-sm text-[var(--muted)]">Taking you to the sign-in page.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg font-semibold text-[var(--foreground)]">Something went wrong.</p>
      <p className="text-sm text-[var(--muted)]">Please try again.</p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
