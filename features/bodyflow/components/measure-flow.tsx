import type { BodyflowDay } from "@/lib/queries/bodyflow";
import {
  latestValue,
  normalizeSeries,
  seriesDelta,
  toPointSegments,
  type Maybe,
} from "../lib/chart-math";
import { FlowAxis } from "./nutrition-flow";

const W = 320;
const H = 110;

interface SeriesDef {
  key: "weightKg" | "chestCm" | "waistCm" | "hipCm";
  label: string;
  unit: string;
  color: string;
}

const SERIES: SeriesDef[] = [
  { key: "weightKg", label: "Vekt", unit: "kg", color: "var(--accent)" },
  { key: "chestCm", label: "Bryst", unit: "cm", color: "#8B5CF6" },
  { key: "waistCm", label: "Midje", unit: "cm", color: "#E0976A" },
  { key: "hipCm", label: "Hofte", unit: "cm", color: "#4FA88A" },
];

export function MeasureFlow({ days }: { days: BodyflowDay[] }) {
  const series = SERIES.map((s) => {
    const raw: Maybe[] = days.map((d) => d[s.key] as number | null);
    return {
      ...s,
      raw,
      normalized: normalizeSeries(raw),
      latest: latestValue(raw),
      delta: seriesDelta(raw),
    };
  });

  const hasAnyData = series.some((s) => s.latest != null);
  const dense = days.length > 30;

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-[var(--text1)]">Measureflow</p>

      {hasAnyData ? (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full" preserveAspectRatio="none">
            {series.map((s) => {
              const segments = toPointSegments(s.normalized, W, H);
              return segments.map((seg, si) => (
                <g key={`${s.key}-${si}`}>
                  {seg.length === 1 ? (
                    <circle cx={seg[0].x} cy={seg[0].y} r={2.5} fill={s.color} />
                  ) : (
                    <polyline
                      points={seg.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={1.75}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  )}
                </g>
              ));
            })}
          </svg>

          <FlowAxis days={days} dense={dense} />

          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {series.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-xs text-[var(--text2)]">{s.label}</span>
                <span className="ml-auto text-xs font-medium text-[var(--text1)]">
                  {s.latest != null ? `${round1(s.latest)} ${s.unit}` : "—"}
                </span>
                {s.delta && Math.abs(s.delta.delta) >= 0.05 ? (
                  <span
                    className="text-[10px] font-medium tabular-nums"
                    style={{ color: s.delta.delta < 0 ? "#4FA88A" : "#E0976A" }}
                  >
                    {s.delta.delta > 0 ? "▲" : "▼"}
                    {round1(Math.abs(s.delta.delta))}
                  </span>
                ) : (
                  <span className="text-[10px] text-[var(--text3)]">–</span>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="py-6 text-center text-xs text-[var(--text3)]">
          Ingen målinger i denne perioden
        </p>
      )}
    </div>
  );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
