import { Card, CardHint, CardTitle, CardValue } from "@/components/ui/card";
import type { DashboardData } from "@/lib/queries/dashboard";
import { formatDate } from "@/lib/utils";
import { LookingForwardCard } from "./looking-forward-card";
import { VibeCard } from "./vibe-card";

function formatNumber(value: number | null | undefined, suffix = ""): string {
  if (value == null) return "—";
  return `${value}${suffix}`;
}

function formatBalance(value: number | null): string {
  if (value == null) return "—";
  if (value === 0) return "On target";
  if (value < 0) return `${Math.abs(value)} kcal deficit`;
  return `${value} kcal surplus`;
}

export function DashboardCards({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-2.5">
      {/* Calories */}
      <Card>
        <CardTitle>Today&apos;s calories</CardTitle>
        <CardValue>{formatNumber(data.todayCalories, " kcal")}</CardValue>
        <CardHint>
          {formatBalance(data.calorieBalance)}
          {data.dailyCalorieTarget != null ? ` · ${data.dailyCalorieTarget} kcal target` : ""}
        </CardHint>
        {data.weekAvgCalories != null && (
          <CardHint className="mt-0.5">
            Average this week: {data.weekAvgCalories} kcal/day
          </CardHint>
        )}
      </Card>

      {/* Latest measurements + weight on same line */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <CardTitle>Latest measurements</CardTitle>
          {data.latestWeight != null && (
            <div className="shrink-0 text-right">
              <p className="text-base font-semibold leading-tight">{data.latestWeight} kg</p>
              {data.measurementsHeaderDate && (
                <p className="text-xs text-[var(--text2)]">
                  {formatDate(data.measurementsHeaderDate)}
                </p>
              )}
            </div>
          )}
        </div>

        {data.latestMeasurement ? (
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-[var(--text2)]">Chest</p>
              <p className="font-medium">{formatNumber(data.latestMeasurement.chestCm, " cm")}</p>
            </div>
            <div>
              <p className="text-[var(--text2)]">Waist</p>
              <p className="font-medium">{formatNumber(data.latestMeasurement.waistCm, " cm")}</p>
            </div>
            <div>
              <p className="text-[var(--text2)]">Hip</p>
              <p className="font-medium">{formatNumber(data.latestMeasurement.hipCm, " cm")}</p>
            </div>
            {!data.latestWeight && data.measurementsHeaderDate && (
              <CardHint className="col-span-3">
                {formatDate(data.measurementsHeaderDate)}
              </CardHint>
            )}
          </div>
        ) : (
          <CardHint className="mt-2">
            {data.latestWeight == null ? "No measurements or weight yet." : "No measurements yet."}
          </CardHint>
        )}
      </Card>

      {/* Training sessions this week */}
      <Card>
        <CardTitle>Trening denne uken</CardTitle>
        <CardValue>
          {data.weekSessionsCount}{" "}
          <span className="text-base font-normal text-[var(--text2)]">
            {data.weekSessionsCount === 1 ? "session" : "sessions"}
          </span>
        </CardValue>
      </Card>

      {/* Looking forward to */}
      <LookingForwardCard initialValue={data.lookingForwardTo} />

      {/* Total overall vibe */}
      <VibeCard initialVibe={data.vibe} />
    </div>
  );
}
