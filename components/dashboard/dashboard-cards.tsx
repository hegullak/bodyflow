import { getT } from "@/lib/i18n/server";
import { Card, CardHint, CardTitle, CardValue } from "@/components/ui/card";
import type { DashboardData } from "@/lib/queries/dashboard";
import { LookingForwardCard } from "./looking-forward-card";
import { VibeCard } from "./vibe-card";

function formatNumber(value: number | null | undefined, suffix = ""): string {
  if (value == null) return "—";
  return `${value}${suffix}`;
}

export async function DashboardCards({ data }: { data: DashboardData }) {
  const t = await getT();
  const d = t.dashboard;

  function formatBalance(value: number | null): string {
    if (value == null) return "—";
    if (value === 0) return d.onTarget;
    if (value < 0) return d.kcalDeficit(Math.abs(value));
    return d.kcalSurplus(value);
  }

  return (
    <div className="space-y-2.5">
      {/* Calories */}
      <Card>
        <CardTitle>{d.todaysCalories}</CardTitle>
        <CardValue>{formatNumber(data.todayCalories, " kcal")}</CardValue>
        <CardHint>
          {formatBalance(data.calorieBalance)}
          {data.dailyCalorieTarget != null ? ` · ${d.kcalTarget(data.dailyCalorieTarget)}` : ""}
        </CardHint>
        {data.weekAvgCalories != null && (
          <CardHint className="mt-0.5">{d.averageThisWeek(data.weekAvgCalories)}</CardHint>
        )}
      </Card>

      {/* Latest measurements + weight */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <CardTitle>{d.latestMeasurements}</CardTitle>
          {data.latestWeight != null && (
            <div className="shrink-0 text-right">
              <p className="text-base font-semibold leading-tight">{data.latestWeight} kg</p>
            </div>
          )}
        </div>

        {data.latestMeasurement ? (
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-[var(--text2)]">{d.chest}</p>
              <p className="font-medium">{formatNumber(data.latestMeasurement.chestCm, " cm")}</p>
            </div>
            <div>
              <p className="text-[var(--text2)]">{d.waist}</p>
              <p className="font-medium">{formatNumber(data.latestMeasurement.waistCm, " cm")}</p>
            </div>
            <div>
              <p className="text-[var(--text2)]">{d.hip}</p>
              <p className="font-medium">{formatNumber(data.latestMeasurement.hipCm, " cm")}</p>
            </div>
          </div>
        ) : (
          <CardHint className="mt-2">
            {data.latestWeight == null ? d.noMeasurementsOrWeight : d.noMeasurements}
          </CardHint>
        )}
      </Card>

      {/* Training this week */}
      <Card>
        <CardTitle>{d.trainingThisWeek}</CardTitle>
        <CardValue>{d.sessions(data.weekSessionsCount)}</CardValue>
      </Card>

      <LookingForwardCard initialValue={data.lookingForwardTo} />
      <VibeCard initialVibe={data.vibe} />
    </div>
  );
}
