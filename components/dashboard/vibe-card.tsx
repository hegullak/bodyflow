"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/card";
import { updateVibeAction } from "@/lib/actions/dashboard";
import { useT } from "@/components/providers/lang-provider";

type Vibe = "good" | "undecided" | "improve";

export function VibeCard({ initialVibe }: { initialVibe: string | null }) {
  const t = useT();
  const d = t.dashboard;
  const [vibe, setVibe] = useState<Vibe | null>((initialVibe as Vibe) ?? null);

  async function toggle(v: Vibe) {
    const next = vibe === v ? null : v;
    setVibe(next);
    await updateVibeAction(next);
  }

  const options: Array<{ vibe: Vibe; label: string }> = [
    { vibe: "good",      label: d.good },
    { vibe: "undecided", label: d.undecided },
    { vibe: "improve",   label: d.canImprove },
  ];

  return (
    <Card>
      <CardTitle>{d.totalOverallVibe}</CardTitle>
      <div className="mt-3 flex gap-2">
        {options.map((opt) => {
          const active = vibe === opt.vibe;
          return (
            <button
              key={opt.vibe}
              type="button"
              onClick={() => toggle(opt.vibe)}
              className={cn(
                "flex-1 rounded-[var(--radius-sm)] border py-1.5 text-xs font-medium transition-all",
                active
                  ? opt.vibe === "good"
                    ? "border-[var(--green)] bg-[var(--green-light)] text-[var(--green)]"
                    : opt.vibe === "undecided"
                      ? "border-[var(--amber)] bg-[var(--amber-light)] text-[var(--amber)]"
                      : "border-[var(--red)] bg-[var(--red-light)] text-[var(--red)]"
                  : "border-[var(--card-border)] bg-transparent text-[var(--text2)]",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
