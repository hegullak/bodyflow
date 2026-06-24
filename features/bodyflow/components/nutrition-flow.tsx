import type { BodyflowDay } from "@/lib/queries/bodyflow";
import { seriesMax } from "../lib/chart-math";

const W = 320;
const H = 120;
const PAD_TOP = 10;
const PAD_BOTTOM = 4;

export function NutritionFlow({
  days,
  target,
}: {
  days: BodyflowDay[];
  target: number | null;
}) {
  const dense = days.length > 30;
  const values = days.map((d) => d.calorieIntake);
  const maxIntake = seriesMax(values);
  const max = Math.max(maxIntake, target ?? 0, 1) * 1.1;

  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const slot = W / days.length;
  const barW = slot * (dense ? 0.7 : 0.55);

  const targetY = target != null ? PAD_TOP + (1 - target / max) * innerH : null;

  const logged = values.filter((v): v is number => v != null);
  const avg = logged.length > 0 ? Math.round(logged.reduce((s, v) => s + v, 0) / logged.length) : null;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm font-semibold text-[var(--text1)]">Nutrientflow</p>
        <p className="text-xs text-[var(--text3)]">
          {avg != null ? (
            <>
              Snitt <span className="font-medium text-[var(--text2)]">{avg}</span>
              {target != null ? <> / mål {target} kcal</> : <> kcal</>}
            </>
          ) : (
            "Ingen logget"
          )}
        </p>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full" preserveAspectRatio="none">
        {targetY != null && (
          <line
            x1={0}
            x2={W}
            y1={targetY}
            y2={targetY}
            stroke="var(--text3)"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.7}
          />
        )}
        {days.map((d, i) => {
          const v = d.calorieIntake;
          if (v == null) return null;
          const h = (v / max) * innerH;
          const x = i * slot + (slot - barW) / 2;
          const y = PAD_TOP + innerH - h;
          const over = target != null && v > target;
          return (
            <rect
              key={d.date}
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 1)}
              rx={dense ? 1 : 2}
              fill={over ? "#E0976A" : "var(--accent)"}
              opacity={d.isToday ? 1 : 0.85}
            />
          );
        })}
      </svg>

      <FlowAxis days={days} dense={dense} />
    </div>
  );
}

export function FlowAxis({ days, dense }: { days: BodyflowDay[]; dense: boolean }) {
  return (
    <div className="mt-1 flex">
      {days.map((d, i) => {
        const show = !dense || i % 5 === 0 || i === days.length - 1;
        return (
          <div
            key={d.date}
            className="min-w-0 flex-1 text-center text-[10px] text-[var(--text3)]"
          >
            {show ? (dense ? d.dayOfMonth : d.weekdayShort) : ""}
          </div>
        );
      })}
    </div>
  );
}
