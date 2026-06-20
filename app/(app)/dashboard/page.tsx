import Link from "next/link";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { TodaySessionsCard } from "@/components/dashboard/today-sessions-card";
import { requireUserId } from "@/lib/auth/current-user";
import { getDashboardData } from "@/lib/queries/dashboard";
import { isWithingsConfigured } from "@/lib/withings/config";
import { getWithingsConnection, syncWithingsForUser } from "@/lib/withings/sync";
import { getTodayScheduledSessions } from "@/lib/actions/schedule";
import { listPrograms } from "@/lib/training/programs";

function localIsoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const userId = await requireUserId();

  await syncWithingsForUser(userId);

  const today = localIsoToday();
  const [data, withingsConnection, todaySessions, programs] = await Promise.all([
    getDashboardData(userId),
    getWithingsConnection(userId),
    getTodayScheduledSessions(today),
    listPrograms(userId),
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

      <TodaySessionsCard
        sessions={todaySessions as Parameters<typeof TodaySessionsCard>[0]["sessions"]}
        programs={programs}
      />

      <div className="mt-2.5">
        <DashboardCards data={data} />
      </div>
    </div>
  );
}
