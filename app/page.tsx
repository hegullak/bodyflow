import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const withingsMessages: Record<string, string> = {
  connected: "Withings connected. Open Profile to confirm sync.",
  denied: "Withings connection was cancelled.",
  error: "Could not connect Withings. Try again from Profile.",
  invalid: "Withings returned an invalid response.",
  invalid_state: "Withings session expired. Try connecting again.",
  not_configured: "Withings is not configured on the server.",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ withings?: string }>;
}) {
  const { userId } = await auth();
  const params = await searchParams;

  if (userId) {
    if (params.withings === "connected") {
      redirect("/profile?withings=connected");
    }
    redirect("/dashboard");
  }

  const withingsMessage = params.withings ? withingsMessages[params.withings] : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-end gap-3 px-4 py-3">
        <Show when="signed-out">
          <SignInButton mode="redirect" forceRedirectUrl="/dashboard">
            <button
              type="button"
              className="text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="redirect" forceRedirectUrl="/dashboard">
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 text-sm font-medium text-[var(--color-primary-foreground)]"
            >
              Sign up
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
        <div className="max-w-md">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-primary)]">
            Private tracking
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">bodyflow</h1>
          <p className="mt-4 text-[var(--color-muted-foreground)]">
            A calm personal cockpit for weight, measurements, and daily calories. No social
            features, no meal database — just your data.
          </p>
          {withingsMessage ? (
            <p
              className={`mt-4 text-sm ${
                params.withings === "connected"
                  ? "text-[var(--color-primary)]"
                  : "text-[#9a5b45]"
              }`}
            >
              {withingsMessage}
            </p>
          ) : null}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <SignUpButton mode="redirect" forceRedirectUrl="/dashboard">
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)]"
              >
                Create account
              </button>
            </SignUpButton>
            <SignInButton mode="redirect" forceRedirectUrl="/dashboard">
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-medium"
              >
                Sign in
              </button>
            </SignInButton>
          </div>
        </div>
      </div>
    </div>
  );
}
