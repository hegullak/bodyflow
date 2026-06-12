"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MealsByType } from "@/lib/actions/meals";
import { MEAL_TYPES } from "@/lib/meals/constants";
import { CalorieBudgetCard } from "@/components/meals/calorie-budget-card";
import { MealSection } from "@/components/meals/meal-section";
import { addDaysToIsoDate, formatDate, todayIsoDate } from "@/lib/utils";

export function MealsView({
  logDate,
  byMeal,
  totalKcal,
  dailyTarget,
}: {
  logDate: string;
  byMeal: MealsByType;
  totalKcal: number;
  dailyTarget: number | null;
}) {
  const router = useRouter();
  const today = todayIsoDate();

  function goToDate(date: string) {
    router.push(`/meals?date=${date}`);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Forrige dag"
          onClick={() => goToDate(addDaysToIsoDate(logDate, -1))}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => goToDate(today)}
          className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] px-2 py-2 text-center text-sm font-medium hover:bg-[var(--color-muted)]"
        >
          {formatDate(logDate)}
          {logDate !== today ? (
            <span className="ml-1 text-xs font-normal text-[var(--color-muted-foreground)]">
              (ikke i dag)
            </span>
          ) : null}
        </button>
        <button
          type="button"
          aria-label="Neste dag"
          onClick={() => goToDate(addDaysToIsoDate(logDate, 1))}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <CalorieBudgetCard dailyTarget={dailyTarget} usedKcal={totalKcal} />

      {MEAL_TYPES.map((mealType) => (
        <MealSection
          key={mealType}
          logDate={logDate}
          mealType={mealType}
          items={byMeal[mealType]}
          onChanged={() => router.refresh()}
        />
      ))}
    </div>
  );
}
