"use client";

import { useRouter } from "next/navigation";
import type { MealsByType } from "@/lib/actions/meals";
import { MEAL_TYPES } from "@/lib/meals/constants";
import { CalorieBudgetCard } from "@/components/meals/calorie-budget-card";
import { MealSection } from "@/components/meals/meal-section";
import { Input, Label } from "@/components/ui/field";

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

  return (
    <div className="space-y-3">
      <div className="form-compact">
        <Label htmlFor="meal-date">Dato</Label>
        <Input
          id="meal-date"
          type="date"
          value={logDate}
          onChange={(e) => router.push(`/meals?date=${e.target.value}`)}
        />
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
