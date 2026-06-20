"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import { levelColor, levelBg, type RecoveryBatteryResult } from "@/lib/calculations/recovery";

function BatteryIcon({ score, color }: { score: number; color: string }) {
  const fillPct = Math.max(0, Math.min(100, score));
  const INNER_H = 28;
  const barH = Math.round((fillPct / 100) * INNER_H);
  const barY = 8 + (INNER_H - barH);

  return (
    <svg width="22" height="38" viewBox="0 0 22 38" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden style={{ flexShrink: 0 }}>
      <rect x="7" y="0" width="8" height="3" rx="1.5" fill={color} opacity="0.7" />
      <rect x="1" y="4" width="20" height="33" rx="3.5" stroke={color} strokeWidth="1.8" />
      {barH > 0 && <rect x="4" y={barY} width="14" height={barH} rx="2" fill={color} />}
    </svg>
  );
}

function InfoSheet({ result, onClose }: { result: RecoveryBatteryResult; onClose: () => void }) {
  const color = levelColor(result.level);

  const factors = [
    {
      name: "Treningsbelastning",
      value: result.factors.trainingLoad,
      max: 90,
      desc: "Antall styrkeøkter, løpeøkter og type (langøkt veier tyngre enn intervall). Beregnes fra fullførte økter siste 7 dager.",
    },
    {
      name: "Manglende pause",
      value: result.factors.recoveryGap,
      max: 35,
      desc: "Antall sammenhengende treningsdager uten hvile. Kroppen trenger regelmessige pauser for å absorbere stimulansen.",
    },
    {
      name: "Drivstoffmismatch",
      value: result.factors.fuelMismatch,
      max: 40,
      desc: "Avvik mellom kaloriinntak og justert behov. Aktiveres kun ved høy treningsbelastning — lavt inntak i hvile har lite å si.",
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[70] rounded-t-2xl bg-[var(--card)] border-t border-[var(--border)] pb-10">
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-[var(--border)]" />
        </div>

        <div className="flex items-center justify-between px-4 py-2">
          <p className="font-semibold text-[var(--text1)]">Slik beregnes batteriet</p>
          <button onClick={onClose} className="p-1 text-[var(--text3)]"><X className="h-5 w-5" /></button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-4 pb-2 space-y-4">

          {/* Disclaimer */}
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card2)] px-3 py-2.5 text-xs leading-relaxed text-[var(--text2)]">
            <span className="font-semibold text-[var(--text1)]">Dette er et estimat — ikke eksakt vitenskap.</span>{" "}
            Batteriet er en indikasjon basert på treningsdataene og kaloriinntaket ditt. Det tar ikke hensyn til søvn, puls, stress eller andre faktorer. Bruk det som et utgangspunkt for refleksjon, ikke som fasit.
          </div>

          {/* Current score */}
          <div className="flex items-center gap-3">
            <BatteryIcon score={result.score} color={color} />
            <div>
              <p className="font-semibold" style={{ color }}>{result.headline}</p>
              <p className="text-xs text-[var(--text3)]">Score: {result.score} / 100 (starter på 100, trekker fra tre faktorer)</p>
            </div>
          </div>

          {/* Factors */}
          <div className="space-y-3">
            {factors.map((f) => {
              const pct = Math.min(f.value / f.max, 1);
              const hasImpact = f.value > 0;
              return (
                <div key={f.name}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-[var(--text1)]">{f.name}</p>
                    <p className="text-xs text-[var(--text3)]">
                      {hasImpact ? `−${f.value} poeng` : "ingen påvirkning"}
                    </p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--card-border)] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct * 100}%`,
                        background: hasImpact ? color : "var(--card-border)",
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-[var(--text3)]">{f.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Data sources */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text3)]">Datagrunnlag</p>
            {[
              "Fullførte styrkeøkter siste 7 dager",
              "Fullførte løpe-/cardioøkter siste 7 dager (type og estimert distanse)",
              "Sammenhengende treningsdager (siste 14 dager)",
              "Kaloriinntak i dag, 3-dagers snitt og 7-dagers snitt",
              "Ditt daglige kaloribudsjett",
            ].map((s) => (
              <div key={s} className="flex items-start gap-2 text-xs text-[var(--text2)]">
                <span className="mt-0.5 text-[var(--text3)]">·</span>
                <span>{s}</span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-[var(--text3)] leading-relaxed">
            Hvile er et treningsgrep, ikke et avvik. Batteriet er ment å hjelpe deg å legge merke til mønstre over tid — ikke dømme enkeltdager.
          </p>
        </div>
      </div>
    </>
  );
}

export function RecoveryBattery({
  result,
  compact = false,
}: {
  result: RecoveryBatteryResult;
  compact?: boolean;
}) {
  const [showInfo, setShowInfo] = useState(false);
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
      <>
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left active:opacity-80"
          style={{ background: bg }}
        >
          <BatteryIcon score={score} color={color} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight" style={{ color }}>{headline}</p>
            <p className="text-xs text-[var(--text3)]">{score}% · {action}</p>
          </div>
          <Info className="h-4 w-4 flex-shrink-0 text-[var(--text3)]" />
        </button>
        {showInfo && <InfoSheet result={result} onClose={() => setShowInfo(false)} />}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowInfo(true)}
        className="w-full rounded-xl border border-[var(--card-border)] px-4 py-3 text-left active:opacity-90"
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
              <Info className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-[var(--text3)]" />
            </div>
            <p className="text-xs leading-relaxed text-[var(--text2)]">{explanation}</p>
            <p className="mt-1.5 text-xs font-medium" style={{ color }}>{action}</p>
          </div>
        </div>

        <div className="mt-3 flex gap-1 h-1">
          {[
            { label: "Belastning", pct: Math.min(result.factors.trainingLoad, 40) / 40 },
            { label: "Pause",      pct: Math.min(result.factors.recoveryGap, 35) / 35 },
            { label: "Drivstoff",  pct: Math.min(result.factors.fuelMismatch, 40) / 40 },
          ].map(({ label, pct }) => (
            <div key={label} className="flex-1 rounded-full overflow-hidden bg-[var(--card-border)]">
              <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: color }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-1 text-[9px] text-[var(--text3)] uppercase tracking-wider">
          <span className="flex-1">Belastning</span>
          <span className="flex-1">Pause</span>
          <span className="flex-1">Drivstoff</span>
        </div>
      </button>

      {showInfo && <InfoSheet result={result} onClose={() => setShowInfo(false)} />}
    </>
  );
}
