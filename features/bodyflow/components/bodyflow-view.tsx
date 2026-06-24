"use client";

import { useState } from "react";
import type { BodyflowTrends, FlowRange } from "@/lib/queries/bodyflow";
import { cn } from "@/lib/utils";
import { NutritionFlow } from "./nutrition-flow";
import { MeasureFlow } from "./measure-flow";
import { TrainingFlow } from "./training-flow";

const RANGES: { value: FlowRange; label: string }[] = [
  { value: "week", label: "Uke" },
  { value: "month", label: "Måned" },
];

export function BodyflowView({ trends }: { trends: BodyflowTrends }) {
  const [range, setRange] = useState<FlowRange>("week");
  const days = range === "week" ? trends.week : trends.month;
  const dense = range === "month";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="page-title mb-0">Bodyflow</h1>
        <div className="flex rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card2)] p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={cn(
                "rounded-[calc(var(--radius-md)-2px)] px-3 py-1 text-xs font-medium transition-colors",
                range === r.value
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text2)]",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <FlowCard>
        <NutritionFlow days={days} target={trends.calorieTarget} dense={dense} />
      </FlowCard>

      <FlowCard>
        <MeasureFlow days={days} dense={dense} />
      </FlowCard>

      <FlowCard>
        <TrainingFlow days={days} dense={dense} />
      </FlowCard>
    </div>
  );
}

function FlowCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card)] px-4 py-3.5">
      {children}
    </div>
  );
}
