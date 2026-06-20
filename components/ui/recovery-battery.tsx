"use client";

import { levelColor, levelBg, type RecoveryBatteryResult } from "@/lib/calculations/recovery";
import { cn } from "@/lib/utils";

function BatteryIcon({ score, color }: { score: number; color: string }) {
  const fillPct = Math.max(0, Math.min(100, score));
  const INNER_H = 28;
  const barH = Math.round((fillPct / 100) * INNER_H);
  const barY = 8 + (INNER_H - barH);           // top of fill bar inside casing

  return (
    <svg
      width="22"
      height="38"
      viewBox="0 0 22 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      {/* nub */}
      <rect x="7" y="0" width="8" height="3" rx="1.5" fill={color} opacity="0.7" />
      {/* casing */}
      <rect x="1" y="4" width="20" height="33" rx="3.5" stroke={color} strokeWidth="1.8" />
      {/* fill */}
      {barH > 0 && (
        <rect x="4" y={barY} width="14" height={barH} rx="2" fill={color} />
      )}
    </svg>
  );
}

function LevelDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

export function RecoveryBattery({
  result,
  compact = false,
}: {
  result: RecoveryBatteryResult;
  compact?: boolean;
}) {
  const { score, level, headline, explanation, action } = result;
  const color = levelColor(level);
  const bg    = levelBg(level);

  const levelLabel: Record<typeof level, string> = {
    green:  "Ladet",
    yellow: "Solid",
    orange: "Sliten",
    red:    "Utladet",
  };

  if (compact) {
    return (
      <div
        className="flex items-center gap-2.5 rounded-xl px-3 py-2"
        style={{ background: bg }}
      >
        <BatteryIcon score={score} color={color} />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight" style={{ color }}>
            {headline}
          </p>
          <p className="text-xs text-[var(--text3)]">{score}% · {action}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-[var(--card-border)] px-4 py-3"
      style={{ background: bg }}
    >
      <div className="flex items-start gap-3">
        <BatteryIcon score={score} color={color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold" style={{ color }}>{headline}</span>
            <span
              className="rounded-full px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider"
              style={{ background: color + "22", color }}
            >
              {levelLabel[level]} · {score}%
            </span>
          </div>
          <p className="text-xs leading-relaxed text-[var(--text2)]">{explanation}</p>
          <p className="mt-1.5 text-xs font-medium" style={{ color }}>{action}</p>
        </div>
      </div>

      {/* Factor bar — visual breakdown */}
      <div className="mt-3 flex gap-1 h-1">
        {[
          { label: "Belastning", pct: Math.min(result.factors.trainingLoad, 40) / 40 },
          { label: "Pause",      pct: Math.min(result.factors.recoveryGap, 35) / 35 },
          { label: "Drivstoff",  pct: Math.min(result.factors.fuelMismatch, 40) / 40 },
        ].map(({ label, pct }) => (
          <div
            key={label}
            title={`${label}`}
            className="flex-1 rounded-full overflow-hidden bg-[var(--card-border)]"
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct * 100}%`, background: color }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1 text-[9px] text-[var(--text3)] uppercase tracking-wider">
        <span className="flex-1">Belastning</span>
        <span className="flex-1">Pause</span>
        <span className="flex-1">Drivstoff</span>
      </div>
    </div>
  );
}
