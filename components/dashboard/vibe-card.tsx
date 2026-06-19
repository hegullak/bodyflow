"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/card";
import { updateVibeAction } from "@/lib/actions/dashboard";
import { useT } from "@/components/providers/lang-provider";

type Vibe = "good" | "undecided" | "improve";

const OPTIONS: Array<{
  vibe: Vibe;
  label: string;
  colorVar: string;
  bgVar: string;
}> = [
  { vibe: "good",      label: "🟢  Good",        colorVar: "--color-green", bgVar: "--color-green-light" },
  { vibe: "undecided", label: "🟡  Undecided",   colorVar: "--color-amber", bgVar: "--color-amber-light" },
  { vibe: "improve",   label: "🔴  Can improve", colorVar: "--color-red",   bgVar: "--color-red-light"   },
];

export function VibeCard({ initialVibe }: { initialVibe: string | null }) {
  const t = useT();
  const d = t.dashboard;
  const [vibe, setVibe] = useState<Vibe | null>((initialVibe as Vibe) ?? null);

  async function toggle(v: Vibe) {
    const next = vibe === v ? null : v;
    setVibe(next);
    await updateVibeAction(next);
  }

  const current = OPTIONS.find((o) => o.vibe === vibe);
  const labels: Record<Vibe, string> = { good: d.good, undecided: d.undecided, improve: d.canImprove };

  return (
    <Card
      style={
        current
          ? { backgroundColor: `var(${current.bgVar})`, borderColor: `var(${current.colorVar})` }
          : undefined
      }
    >
      <CardTitle>{d.totalOverallVibe}</CardTitle>

      <div className="mt-3 flex gap-2">
        {OPTIONS.map((opt) => {
          const active = vibe === opt.vibe;
          return (
            <button
              key={opt.vibe}
              type="button"
              onClick={() => toggle(opt.vibe)}
              className={cn(
                "flex-1 rounded-[var(--radius-sm)] border py-1.5 text-xs font-medium transition-all",
                active
                  ? "border-transparent"
                  : "border-[var(--border)] bg-[var(--card)] text-[var(--text2)]",
              )}
              style={
                active
                  ? {
                      backgroundColor: `var(${opt.bgVar})`,
                      color: `var(${opt.colorVar})`,
                      borderColor: `var(${opt.colorVar})`,
                    }
                  : undefined
              }
            >
              {labels[opt.vibe]}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
