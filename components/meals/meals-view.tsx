"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, UtensilsCrossed } from "lucide-react";
import type { MealLogItem } from "@/db/schema";
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
  previousDayMeals,
  twoDaysAgoMeals,
}: {
  logDate: string;
  byMeal: MealsByType;
  totalKcal: number;
  dailyTarget: number | null;
  previousDayMeals: MealLogItem[];
  twoDaysAgoMeals: MealLogItem[];
}) {
  const router = useRouter();
  const today = todayIsoDate();

  function goToDate(date: string) {
    router.push(`/meals?date=${date}`);
  }

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 bg-[var(--background)] px-4 py-3 md:mx-0 md:px-0">
        <CalorieBudgetCard dailyTarget={dailyTarget} usedKcal={totalKcal} />
      </div>

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

      <Link
        href="/meals/recipes"
        className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-4 py-3 active:bg-[var(--card2)]"
      >
        <UtensilsCrossed className="h-5 w-5 shrink-0 text-[var(--accent)]" />
        <div className="flex-1">
          <p className="text-sm font-medium text-[var(--text1)]">Oppskrifter</p>
          <p className="text-xs text-[var(--text3)]">Lag egne retter med beregnet kcal/100g</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text3)]" />
      </Link>

      {MEAL_TYPES.map((mealType) => (
        <MealSection
          key={mealType}
          logDate={logDate}
          mealType={mealType}
          items={byMeal[mealType]}
          previousDayItems={previousDayMeals}
          twoDaysAgoItems={twoDaysAgoMeals}
          onChanged={() => router.refresh()}
        />
      ))}
      </div>
    </div>
  );
}
