"use client";

import Link from "next/link";
import { useT } from "@/components/providers/lang-provider";

export function CalorieBudgetCard({
  dailyTarget,
  usedKcal,
}: {
  dailyTarget: number | null;
  usedKcal: number;
}) {
  const t = useT();
  const m = t.meals;
  const availableKcal = dailyTarget != null ? dailyTarget - usedKcal : null;

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-primary)]/25 bg-[var(--color-accent)] px-3 py-2">
      <p className="mb-2 text-xs text-[var(--color-muted-foreground)]">{m.caloriesToday}</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {m.total}
          </p>
          <p className="text-lg font-semibold">{dailyTarget ?? "—"}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {m.used}
          </p>
          <p className="text-lg font-semibold">{usedKcal}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {m.available}
          </p>
          <p
            className={`text-lg font-semibold ${
              availableKcal != null && availableKcal < 0 ? "text-[#9a5b45]" : ""
            }`}
          >
            {availableKcal ?? "—"}
          </p>
        </div>
      </div>
      {dailyTarget == null && (
        <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
          <Link href="/profile" className="text-[var(--color-primary)]">
            {m.setCalorieTarget}
          </Link>
        </p>
      )}
    </div>
  );
}
