import Link from "next/link";
import { Card, CardHint, CardTitle, CardValue } from "@/components/ui/card";
import type { DashboardData } from "@/lib/queries/dashboard";
import { formatDate } from "@/lib/utils";

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
    <div className="space-y-4">
      {!data.profileComplete ? (
        <Card className="border-[var(--color-primary)]/30 bg-[var(--color-accent)]">
          <CardTitle>Complete your profile</CardTitle>
          <CardHint className="mt-2">
            Add height, sex, and activity level to unlock BMI, BMR, and TDEE estimates.
          </CardHint>
          <Link
            href="/profile"
            className="mt-3 inline-flex text-sm font-medium text-[var(--color-primary)]"
          >
            Set up profile →
          </Link>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardTitle>Latest weight</CardTitle>
          <CardValue>{formatNumber(data.latestWeight, " kg")}</CardValue>
          <CardHint>
            {data.latestWeightDate ? formatDate(data.latestWeightDate) : "No entries yet"}
          </CardHint>
        </Card>

        <Card>
          <CardTitle>BMI</CardTitle>
          <CardValue>{formatNumber(data.bmi)}</CardValue>
          <CardHint>{data.bmiCategory ?? "Add weight and profile"}</CardHint>
        </Card>

        <Card>
          <CardTitle>Normal range</CardTitle>
          <CardValue className="text-lg">
            {data.normalRange
              ? `${data.normalRange.minKg}–${data.normalRange.maxKg} kg`
              : "—"}
          </CardValue>
          <CardHint>Based on your height</CardHint>
        </Card>

        <Card>
          <CardTitle>7-day avg weight</CardTitle>
          <CardValue>{formatNumber(data.avgWeight7d, " kg")}</CardValue>
          <CardHint>Rolling average</CardHint>
        </Card>

        <Card>
          <CardTitle>BMR</CardTitle>
          <CardValue>{formatNumber(data.bmr, " kcal")}</CardValue>
          <CardHint>Mifflin-St Jeor</CardHint>
        </Card>

        <Card>
          <CardTitle>TDEE</CardTitle>
          <CardValue>{formatNumber(data.tdee, " kcal")}</CardValue>
          <CardHint>Estimated maintenance</CardHint>
        </Card>

        <Card>
          <CardTitle>Today&apos;s calories</CardTitle>
          <CardValue>{formatNumber(data.todayCalories, " kcal")}</CardValue>
          <CardHint>{formatBalance(data.calorieBalance)}</CardHint>
        </Card>

        <Card>
          <CardTitle>7-day avg calories</CardTitle>
          <CardValue>{formatNumber(data.avgCalories7d, " kcal")}</CardValue>
          <CardHint>Rolling average</CardHint>
        </Card>
      </div>

      <Card>
        <CardTitle>Weight trend</CardTitle>
        {data.weightTrend.length > 0 ? (
          <div className="mt-3 flex items-end gap-2">
            {data.weightTrend.map((point) => {
              const min = Math.min(...data.weightTrend.map((p) => p.weightKg));
              const max = Math.max(...data.weightTrend.map((p) => p.weightKg));
              const range = Math.max(max - min, 0.5);
              const height = 24 + ((point.weightKg - min) / range) * 56;
              return (
                <div key={point.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-[var(--color-primary)]/70"
                    style={{ height }}
                    title={`${formatDate(point.date)}: ${point.weightKg} kg`}
                  />
                  <span className="text-[10px] text-[var(--color-muted-foreground)]">
                    {point.date.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <CardHint className="mt-2">Log weight for a few days to see a simple trend.</CardHint>
        )}
      </Card>

      <Card>
        <CardTitle>Latest measurements</CardTitle>
        {data.latestMeasurement ? (
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-[var(--color-muted-foreground)]">Chest</p>
              <p className="font-medium">{formatNumber(data.latestMeasurement.chestCm, " cm")}</p>
            </div>
            <div>
              <p className="text-[var(--color-muted-foreground)]">Waist</p>
              <p className="font-medium">{formatNumber(data.latestMeasurement.waistCm, " cm")}</p>
            </div>
            <div>
              <p className="text-[var(--color-muted-foreground)]">Hip</p>
              <p className="font-medium">{formatNumber(data.latestMeasurement.hipCm, " cm")}</p>
            </div>
            <CardHint className="col-span-3">
              {formatDate(data.latestMeasurement.measuredOn)}
            </CardHint>
          </div>
        ) : (
          <CardHint className="mt-2">No measurements yet. Body measurements come in a later slice.</CardHint>
        )}
      </Card>
    </div>
  );
}
