import Link from "next/link";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { Card } from "@/components/ui/card";
import { requireUserId } from "@/lib/auth/current-user";
import { getDashboardData } from "@/lib/queries/dashboard";
import { syncWithingsForUser } from "@/lib/withings/sync";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ withings?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;

  await syncWithingsForUser(userId);
  const data = await getDashboardData(userId);

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Your private overview for today and the past week.</p>

      {params.withings === "connected" ? (
        <p className="mb-4 text-sm text-[var(--color-primary)]">
          Withings connected — weight is syncing in the background.
        </p>
      ) : null}

      <Card className="mb-4">
        <h2 className="text-base font-semibold">Quick check-in</h2>
        <p className="mb-3 text-sm text-[var(--color-muted-foreground)]">
          Log weight, calories and measurements for today.
        </p>
        <Link
          href="/check-in"
          className="inline-flex h-10 items-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)]"
        >
          Go to check-in
        </Link>
      </Card>

      <DashboardCards data={data} />
    </div>
  );
}
