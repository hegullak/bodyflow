import Link from "next/link";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { TodaySessionsCard } from "@/components/dashboard/today-sessions-card";
import { RecoveryCard } from "@/components/dashboard/recovery-card";
import { MeasurementsCard } from "@/components/dashboard/measurements-card";
import { TrainingCard } from "@/components/dashboard/training-card";
import { ComebackBanner } from "@/components/dashboard/comeback-banner";
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
    <div className="flex flex-col gap-2.5">
      <h1 className="page-title">Dashboard</h1>

      <ComebackBanner lastActivityDate={data.latestWeightDate} />

      {showWithingsPrompt && (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Withings is not connected.{" "}
          <Link href="/profile" className="font-medium text-[var(--color-primary)]">
            Connect in Profile
          </Link>{" "}
          to sync weight automatically.
        </p>
      )}

      <RecoveryCard data={data} />

      <MeasurementsCard data={data} />

      <TrainingCard sessionsCount={data.weekSessionsCount} />

      <TodaySessionsCard
        sessions={todaySessions as Parameters<typeof TodaySessionsCard>[0]["sessions"]}
        programs={programs}
      />

      <DashboardCards data={data} />
    </div>
  );
}
