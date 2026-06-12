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
    <div className="space-y-2.5">
      {!data.profileComplete ? (
        <Card className="border-[var(--color-primary)]/30 bg-[var(--color-accent)]">
          <CardTitle>Complete your profile</CardTitle>
          <CardHint className="mt-2">
            Add height, sex, and activity level to unlock BMI and TDEE estimates.
          </CardHint>
          <Link
            href="/profile"
            className="mt-3 inline-flex text-sm font-medium text-[var(--color-primary)]"
          >
            Set up profile →
          </Link>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Today&apos;s calories</CardTitle>
        <CardValue>{formatNumber(data.todayCalories, " kcal")}</CardValue>
        <CardHint>
          {formatBalance(data.calorieBalance)}
          {data.dailyCalorieTarget != null
            ? ` · ${data.dailyCalorieTarget} kcal target`
            : data.tdee != null
              ? " · vs TDEE"
              : ""}
        </CardHint>
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
          <CardHint className="mt-2">No measurements yet.</CardHint>
        )}
      </Card>

      <Card>
        <CardTitle>Latest weight</CardTitle>
        <CardValue>{formatNumber(data.latestWeight, " kg")}</CardValue>
        <CardHint>
          {data.latestWeightDate ? formatDate(data.latestWeightDate) : "No entries yet"}
        </CardHint>
      </Card>

      <div className="grid grid-cols-2 gap-2.5">
        <Card>
          <CardTitle>BMI</CardTitle>
          <CardValue>{formatNumber(data.bmi)}</CardValue>
          <CardHint>
            {data.bmi != null ? (
              <>
                {data.bmiCategory}. Body Mass Index from your latest weight and profile height.
              </>
            ) : (
              <>Add weight and profile height to calculate BMI.</>
            )}
          </CardHint>
        </Card>

        <Card>
          <CardTitle>TDEE</CardTitle>
          <CardValue>{formatNumber(data.tdee, " kcal")}</CardValue>
          <CardHint>
            Estimated daily calories to maintain weight, based on profile activity level.
          </CardHint>
        </Card>
      </div>
    </div>
  );
}
