import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-primary)]">
          Private tracking
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">bodyflow</h1>
        <p className="mt-4 text-[var(--color-muted-foreground)]">
          A calm personal cockpit for weight, measurements, and daily calories. No social
          features, no meal database — just your data.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/sign-in"
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)]"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-4 text-sm font-medium"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
