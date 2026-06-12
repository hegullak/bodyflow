import Link from "next/link";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { requireUserId } from "@/lib/auth/current-user";
import { getDashboardData } from "@/lib/queries/dashboard";
import { isWithingsConfigured } from "@/lib/withings/config";
import { getWithingsConnection, syncWithingsForUser } from "@/lib/withings/sync";

export default async function DashboardPage() {
  const userId = await requireUserId();

  await syncWithingsForUser(userId);

  const [data, withingsConnection] = await Promise.all([
    getDashboardData(userId),
    getWithingsConnection(userId),
  ]);

  const showWithingsPrompt = isWithingsConfigured() && withingsConnection == null;

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      {showWithingsPrompt ? (
        <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">
          Withings is not connected.{" "}
          <Link href="/profile" className="font-medium text-[var(--color-primary)]">
            Connect in Profile
          </Link>{" "}
          to sync weight automatically.
        </p>
      ) : null}

      <DashboardCards data={data} />
    </div>
  );
}
