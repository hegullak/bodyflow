import { TodayLogForm } from "@/components/forms/today-log-form";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { Card } from "@/components/ui/card";
import { getDailyLogForDate } from "@/lib/actions/daily-log";
import { requireUserId } from "@/lib/auth/current-user";
import { getDashboardData } from "@/lib/queries/dashboard";
import { syncWithingsForUser } from "@/lib/withings/sync";
import { todayIsoDate } from "@/lib/utils";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const today = todayIsoDate();

  await syncWithingsForUser(userId);

  const [data, todayLog] = await Promise.all([
    getDashboardData(userId),
    getDailyLogForDate(userId, today),
  ]);

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Your private overview for today and the past week.</p>

      <Card className="mb-4">
        <h2 className="text-base font-semibold">Today&apos;s log</h2>
        <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">
          Quick entry for weight and calories.
        </p>
        <TodayLogForm logDate={today} todayLog={todayLog} />
      </Card>

      <DashboardCards data={data} />
    </div>
  );
}
