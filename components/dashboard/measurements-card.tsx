import { getT } from "@/lib/i18n/server";
import { Card, CardHint, CardTitle, CardValue } from "@/components/ui/card";
import type { DashboardData } from "@/lib/queries/dashboard";

function formatNumber(value: number | null | undefined, suffix = ""): string {
  if (value == null) return "—";
  return `${value}${suffix}`;
}

export async function MeasurementsCard({ data }: { data: DashboardData }) {
  const t = await getT();
  const d = t.dashboard;

  return (
    <Card>
      <CardTitle>{d.latestMeasurements}</CardTitle>

      {data.latestWeight != null && (
        <CardValue className="mt-0.5">{data.latestWeight} kg</CardValue>
      )}

      {data.latestMeasurement ? (
        <p className="mt-1.5 text-sm text-[var(--text2)]">
          {d.chest} {formatNumber(data.latestMeasurement.chestCm, " cm")}
          {"  ·  "}
          {d.waist} {formatNumber(data.latestMeasurement.waistCm, " cm")}
          {"  ·  "}
          {d.hip} {formatNumber(data.latestMeasurement.hipCm, " cm")}
        </p>
      ) : (
        <CardHint className="mt-2">
          {data.latestWeight == null ? d.noMeasurementsOrWeight : d.noMeasurements}
        </CardHint>
      )}
    </Card>
  );
}
