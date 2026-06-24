import { Dumbbell } from "lucide-react";
import type { BodyflowDay } from "@/lib/queries/bodyflow";
import { cn } from "@/lib/utils";

export function TrainingFlow({ days, dense }: { days: BodyflowDay[]; dense: boolean }) {
  const workouts = days.filter((d) => d.hasWorkout).length;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm font-semibold text-[var(--text1)]">Trening</p>
        <p className="text-xs text-[var(--text3)]">
          <span className="font-medium text-[var(--text2)]">{workouts}</span>{" "}
          {workouts === 1 ? "økt" : "økter"}
        </p>
      </div>

      <div className={cn("grid gap-1.5", dense ? "grid-cols-10" : "grid-cols-7")}>
        {days.map((d) => (
          <div
            key={d.date}
            className={cn(
              "flex flex-col items-center gap-1 rounded-[var(--radius-md)] py-2 transition-colors",
              d.hasWorkout
                ? "bg-[var(--accent-light)]"
                : "bg-[var(--card2)]",
              d.isToday && "ring-1 ring-[var(--accent)]",
              d.isFuture && "opacity-40",
            )}
          >
            <span
              className={cn(
                "text-[10px] font-medium",
                d.hasWorkout ? "text-[var(--accent)]" : "text-[var(--text3)]",
              )}
            >
              {dense ? d.dayOfMonth : d.weekdayShort}
            </span>
            {d.hasWorkout ? (
              <Dumbbell className="h-3.5 w-3.5 text-[var(--accent)]" strokeWidth={2} />
            ) : (
              <span className="h-1 w-1 rounded-full bg-[var(--text3)] opacity-50" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
