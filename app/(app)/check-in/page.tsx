import Link from "next/link";
import { TodayLogForm } from "@/components/forms/today-log-form";
import { MeasurementForm } from "@/components/forms/measurement-form";
import { Card } from "@/components/ui/card";
import { getDailyLogForDate } from "@/lib/actions/daily-log";
import { getProfileForUser } from "@/lib/actions/profile";
import { getMeasurementForDate } from "@/lib/actions/measurements";
import { requireUserId } from "@/lib/auth/current-user";
import { syncWithingsForUser } from "@/lib/withings/sync";
import { todayIsoDate } from "@/lib/utils";

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const today = todayIsoDate();
  const focusWeight = params.focus === "weight";

  await syncWithingsForUser(userId);

  const [todayLog, todayMeasurement, profile] = await Promise.all([
    getDailyLogForDate(userId, today),
    getMeasurementForDate(userId, today),
    getProfileForUser(userId),
  ]);

  return (
    <div>
      <h1 className="page-title">Check-in</h1>
      <p className="page-subtitle">Quick daily log for weight, calories and body measurements.</p>

      <Card className="mb-4" id="weight-section">
        <h2 className="text-base font-semibold">Today&apos;s body log</h2>
        <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">
          Weight syncs from Withings when connected. Calories are manual.
        </p>
        <TodayLogForm
          logDate={today}
          todayLog={todayLog}
          calorieTarget={profile?.dailyCalorieTarget}
          focusWeight={focusWeight}
        />
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Body measurements</h2>
        <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">
          Waist, chest and hip in cm. Usually once a week is enough.
        </p>
        <MeasurementForm measuredOn={today} measurement={todayMeasurement} />
      </Card>

      <p className="mt-4 text-center text-sm text-[var(--color-muted-foreground)]">
        <Link href="/statistics" className="text-[var(--color-primary)]">
          View full statistics →
        </Link>
      </p>
    </div>
  );
}
