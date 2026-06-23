"use server";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { mealLogItems } from "@/db/schema";
import { requireUserId } from "@/lib/auth/current-user";
import { type ActionResult, flattenZodErrors } from "@/shared/actions/types";
import {
  calculateMealCalories,
  calculateMacros,
  calculateCaloriePercentage,
  calculateRemainingCalories,
  calculateMacroBalance,
  type MealItem,
} from "../nutritionCalc";

const getDailyNutritionSchema = z.object({
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetCalories: z.number().min(1000).max(5000),
});

export type DailyNutritionSummary = {
  totalCalories: number;
  caloriePercentage: number;
  remainingCalories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  macroBalance: number;
  mealCount: number;
};

/**
 * Get daily nutrition summary with calculations.
 * Validates input with Zod, calculates totals and balance.
 */
export async function getDailyNutritionSummaryAction(
  input: unknown,
): Promise<ActionResult<DailyNutritionSummary>> {
  try {
    const userId = await requireUserId();
    const params = getDailyNutritionSchema.parse(input);

    const db = getDb();
    const meals = await db
      .select({
        id: mealLogItems.id,
        caloriesKcal: mealLogItems.caloriesKcal,
        protein: mealLogItems.protein,
        carbs: mealLogItems.carbs,
        fat: mealLogItems.fat,
      })
      .from(mealLogItems)
      .where(
        and(
          eq(mealLogItems.userId, userId),
          eq(mealLogItems.logDate, params.logDate),
          isNull(mealLogItems.deletedAt),
        ),
      );

    const mealItems: MealItem[] = meals.map(m => ({
      id: m.id,
      caloriesKcal: m.caloriesKcal,
      protein: m.protein ?? undefined,
      carbs: m.carbs ?? undefined,
      fat: m.fat ?? undefined,
    }));

    const totalCalories = calculateMealCalories(mealItems);
    const macros = calculateMacros(mealItems);
    const macroBalance = calculateMacroBalance(macros.protein, macros.carbs, macros.fat);

    return {
      ok: true,
      data: {
        totalCalories,
        caloriePercentage: calculateCaloriePercentage(totalCalories, params.targetCalories),
        remainingCalories: calculateRemainingCalories(totalCalories, params.targetCalories),
        macros,
        macroBalance,
        mealCount: meals.length,
      },
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        ok: false,
        error: "Invalid nutrition parameters",
        fieldErrors: flattenZodErrors(err),
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to get nutrition summary",
    };
  }
}
