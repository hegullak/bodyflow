import { Card, CardHint, CardTitle, CardValue } from "@/components/ui/card";
import type { StatisticsData } from "@/lib/queries/statistics";
import { formatDate } from "@/lib/utils";

function fmt(value: number | null, suffix = ""): string {
  if (value == null) return "—";
  return `${value}${suffix}`;
}

export function StatisticsView({ data }: { data: StatisticsData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardTitle>Weight logs</CardTitle>
          <CardValue>{data.totalWeightLogs}</CardValue>
          <CardHint>Since 2020</CardHint>
        </Card>
        <Card>
          <CardTitle>Measurement logs</CardTitle>
          <CardValue>{data.totalMeasurements}</CardValue>
          <CardHint>Since 2020</CardHint>
        </Card>
      </div>

      <Card>
        <CardTitle>Yearly averages</CardTitle>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="text-[var(--color-muted-foreground)]">
                <th className="py-2 pr-3 font-medium">Year</th>
                <th className="py-2 pr-3 font-medium">Weight</th>
                <th className="py-2 pr-3 font-medium">Waist</th>
                <th className="py-2 pr-3 font-medium">Chest</th>
                <th className="py-2 font-medium">Hip</th>
              </tr>
            </thead>
            <tbody>
              {data.yearly.map((row) => (
                <tr key={row.year} className="border-t border-[var(--color-border)]">
                  <td className="py-2 pr-3 font-medium">{row.year}</td>
                  <td className="py-2 pr-3">{fmt(row.avgWeightKg, " kg")}</td>
                  <td className="py-2 pr-3">{fmt(row.avgWaistCm, " cm")}</td>
                  <td className="py-2 pr-3">{fmt(row.avgChestCm, " cm")}</td>
                  <td className="py-2">{fmt(row.avgHipCm, " cm")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardTitle>Monthly averages</CardTitle>
        <div className="mt-3 max-h-96 overflow-y-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="sticky top-0 bg-[var(--color-card)]">
              <tr className="text-[var(--color-muted-foreground)]">
                <th className="py-2 pr-3 font-medium">Month</th>
                <th className="py-2 pr-3 font-medium">Weight</th>
                <th className="py-2 pr-3 font-medium">Waist</th>
                <th className="py-2 pr-3 font-medium">Chest</th>
                <th className="py-2 font-medium">Hip</th>
              </tr>
            </thead>
            <tbody>
              {data.monthly.map((row) => (
                <tr key={`${row.year}-${row.month}`} className="border-t border-[var(--color-border)]">
                  <td className="py-2 pr-3 font-medium">{row.label}</td>
                  <td className="py-2 pr-3">{fmt(row.avgWeightKg, " kg")}</td>
                  <td className="py-2 pr-3">{fmt(row.avgWaistCm, " cm")}</td>
                  <td className="py-2 pr-3">{fmt(row.avgChestCm, " cm")}</td>
                  <td className="py-2">{fmt(row.avgHipCm, " cm")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {data.latestMeasurement ? (
        <Card>
          <CardTitle>Latest measurements</CardTitle>
          <CardHint className="mt-2">{formatDate(data.latestMeasurement.measuredOn)}</CardHint>
          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-[var(--color-muted-foreground)]">Waist</p>
              <p className="font-medium">{fmt(data.latestMeasurement.waistCm, " cm")}</p>
            </div>
            <div>
              <p className="text-[var(--color-muted-foreground)]">Chest</p>
              <p className="font-medium">{fmt(data.latestMeasurement.chestCm, " cm")}</p>
            </div>
            <div>
              <p className="text-[var(--color-muted-foreground)]">Hip</p>
              <p className="font-medium">{fmt(data.latestMeasurement.hipCm, " cm")}</p>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
