"use client";

import { recoveryColorHex, recoveryLabel, recoveryTip } from "@/lib/calculations/recovery";

function BatteryIcon({ score, color }: { score: number; color: string }) {
  const fillPct = Math.max(0, Math.min(100, score));
  const barH = Math.round((fillPct / 100) * 28);

  return (
    <svg width="28" height="44" viewBox="0 0 28 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* terminal nub */}
      <rect x="9" y="0" width="10" height="4" rx="2" fill={color} opacity="0.6" />
      {/* outer casing */}
      <rect x="1" y="5" width="26" height="38" rx="4" stroke={color} strokeWidth="2" />
      {/* fill bar — grows from bottom */}
      <rect
        x="4"
        y={5 + 3 + (28 - barH)}
        width="20"
        height={barH}
        rx="2"
        fill={color}
        style={{ transition: "height 0.6s ease, y 0.6s ease" }}
      />
    </svg>
  );
}

export function RecoveryBattery({
  score,
  trainingHigh,
  caloriesLow,
  lang = "no",
  compact = false,
}: {
  score: number;
  trainingHigh: boolean;
  caloriesLow: boolean;
  lang?: string;
  compact?: boolean;
}) {
  const color = recoveryColorHex(score);
  const label = recoveryLabel(score, lang);
  const tip   = recoveryTip(score, trainingHigh, caloriesLow, lang);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <BatteryIcon score={score} color={color} />
        <div>
          <p className="text-sm font-semibold" style={{ color }}>{label}</p>
          <p className="text-xs text-[var(--text3)]">{score}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
      <BatteryIcon score={score} color={color} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <p className="text-base font-bold" style={{ color }}>{label}</p>
          <p className="text-xs text-[var(--text3)]">{score}%</p>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--text2)]">{tip}</p>
      </div>
    </div>
  );
}
