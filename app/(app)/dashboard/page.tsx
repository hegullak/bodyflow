import Link from "next/link";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { TodaySessionsCard } from "@/components/dashboard/today-sessions-card";
import { RecoveryCard } from "@/components/dashboard/recovery-card";
import { RecoveryPageGradient } from "@/components/ui/recovery-page-gradient";
import { requireUserId } from "@/lib/auth/current-user";
import { getDashboardData } from "@/lib/queries/dashboard";
import { isWithingsConfigured } from "@/lib/withings/config";
import { getWithingsConnection, syncWithingsForUser } from "@/lib/withings/sync";
import { getTodayScheduledSessions } from "@/lib/actions/schedule";
import { listPrograms } from "@/lib/training/programs";
import { calcRecoveryScore, recoveryColorHex } from "@/lib/calculations/recovery";

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

  const score = calcRecoveryScore({
    strengthSessionsThisWeek: data.weekSessionsCount,
    completedCardioSlugs: data.weekCompletedCardioSlugs,
    weekAvgCalories: data.weekAvgCalories,
    dailyCalorieTarget: data.dailyCalorieTarget,
  });

  return (
    <div className="relative">
      <RecoveryPageGradient score={score} />

      <div className="relative z-10 flex flex-col gap-2.5">
        <h1 className="page-title">Dashboard</h1>

        {showWithingsPrompt ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Withings is not connected.{" "}
            <Link href="/profile" className="font-medium text-[var(--color-primary)]">
              Connect in Profile
            </Link>{" "}
            to sync weight automatically.
          </p>
        ) : null}

        <RecoveryCard data={data} />

        <TodaySessionsCard
          sessions={todaySessions as Parameters<typeof TodaySessionsCard>[0]["sessions"]}
          programs={programs}
        />

        <DashboardCards data={data} />
      </div>
    </div>
  );
}
