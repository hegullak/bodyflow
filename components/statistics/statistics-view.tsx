import { Card, CardTitle } from "@/components/ui/card";
import type { StatisticsData } from "@/lib/queries/statistics";

function fmt(value: number | null, suffix = ""): string {
  if (value == null) return "—";
  return `${value}${suffix}`;
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function StatisticsView({ data }: { data: StatisticsData }) {
  return (
    <div className="space-y-4">
      {/* Summary counts */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardTitle>Vektmålinger</CardTitle>
          <p className="mt-1 text-2xl font-bold">{data.totalWeightLogs}</p>
          <p className="text-xs text-[var(--text3)]">siden 2020</p>
        </Card>
        <Card>
          <CardTitle>Kroppsmål</CardTitle>
          <p className="mt-1 text-2xl font-bold">{data.totalMeasurements}</p>
          <p className="text-xs text-[var(--text3)]">siden 2020</p>
        </Card>
      </div>

      {/* All individual weight entries */}
      {data.allWeightEntries.length > 0 && (
        <Card>
          <CardTitle>Alle vektmålinger</CardTitle>
          <div className="mt-3 max-h-[28rem] overflow-y-auto -mx-4 px-4">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--card)]">
                <tr className="text-left text-[var(--text3)]">
                  <th className="pb-2 font-medium">Dato</th>
                  <th className="pb-2 text-right font-medium">Vekt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {data.allWeightEntries.map((entry) => (
                  <tr key={entry.date}>
                    <td className="py-2 text-[var(--text2)]">{fmtDate(entry.date)}</td>
                    <td className="py-2 text-right font-medium">{fmt(entry.value, " kg")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* All individual body measurement entries */}
      {data.allMeasurementEntries.length > 0 && (
        <Card>
          <CardTitle>Alle kroppsmål</CardTitle>
          <div className="mt-3 max-h-[28rem] overflow-y-auto -mx-4 px-4">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--card)]">
                <tr className="text-left text-[var(--text3)]">
                  <th className="pb-2 font-medium">Dato</th>
                  <th className="pb-2 text-right font-medium">Midje</th>
                  <th className="pb-2 text-right font-medium">Bryst</th>
                  <th className="pb-2 text-right font-medium">Hofte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {data.allMeasurementEntries.map((entry) => (
                  <tr key={entry.measuredOn}>
                    <td className="py-2 text-[var(--text2)]">{fmtDate(entry.measuredOn)}</td>
                    <td className="py-2 text-right">{fmt(entry.waistCm, " cm")}</td>
                    <td className="py-2 text-right">{fmt(entry.chestCm, " cm")}</td>
                    <td className="py-2 text-right">{fmt(entry.hipCm, " cm")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Yearly summary */}
      <Card>
        <CardTitle>Årsgjennomsnitt</CardTitle>
        <div className="mt-3 overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--text3)]">
                <th className="pb-2 font-medium">År</th>
                <th className="pb-2 text-right font-medium">Vekt</th>
                <th className="pb-2 text-right font-medium">Midje</th>
                <th className="pb-2 text-right font-medium">Bryst</th>
                <th className="pb-2 text-right font-medium">Hofte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {data.yearly.slice().reverse().map((row) => (
                <tr key={row.year}>
                  <td className="py-2 font-medium">{row.year}</td>
                  <td className="py-2 text-right">{fmt(row.avgWeightKg, " kg")}</td>
                  <td className="py-2 text-right">{fmt(row.avgWaistCm, " cm")}</td>
                  <td className="py-2 text-right">{fmt(row.avgChestCm, " cm")}</td>
                  <td className="py-2 text-right">{fmt(row.avgHipCm, " cm")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
