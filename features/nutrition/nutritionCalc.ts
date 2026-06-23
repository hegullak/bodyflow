/**
 * Nutrition domain calculations.
 * Pure logic for calorie summaries, macros, and nutritional analysis.
 */

import { z } from "zod";

export const MealItemSchema = z.object({
  id: z.string(),
  caloriesKcal: z.number().min(0),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
});

export type MealItem = z.infer<typeof MealItemSchema>;

export const RecipeFoodSchema = z.object({
  foodId: z.string(),
  quantityGrams: z.number().min(0.1),
  kcalPer100g: z.number().min(0),
  proteinPer100g: z.number().min(0).optional(),
  carbsPer100g: z.number().min(0).optional(),
  fatPer100g: z.number().min(0).optional(),
});

export type RecipeFood = z.infer<typeof RecipeFoodSchema>;

/**
 * Calculate total calories from meal items.
 */
export function calculateMealCalories(items: MealItem[]): number {
  return items.reduce((sum, item) => sum + item.caloriesKcal, 0);
}

/**
 * Calculate macro totals from meal items.
 */
export function calculateMacros(items: MealItem[]) {
  return {
    protein: items.reduce((sum, item) => sum + (item.protein ?? 0), 0),
    carbs: items.reduce((sum, item) => sum + (item.carbs ?? 0), 0),
    fat: items.reduce((sum, item) => sum + (item.fat ?? 0), 0),
  };
}

/**
 * Calculate calorie percentage of daily target.
 */
export function calculateCaloriePercentage(consumed: number, target: number): number {
  if (target === 0) return 0;
  return Math.min((consumed / target) * 100, 100);
}

/**
 * Calculate remaining calories in budget.
 */
export function calculateRemainingCalories(consumed: number, target: number): number {
  return Math.max(0, target - consumed);
}

/**
 * Calculate recipe total from individual foods.
 */
export function calculateRecipeCalories(foods: RecipeFood[]): number {
  return foods.reduce((sum, food) => {
    const caloriesPerGram = food.kcalPer100g / 100;
    return sum + caloriesPerGram * food.quantityGrams;
  }, 0);
}

/**
 * Calculate recipe macros.
 */
export function calculateRecipeMacros(foods: RecipeFood[]) {
  return foods.reduce(
    (totals, food) => {
      const grams = food.quantityGrams;
      return {
        protein: totals.protein + ((food.proteinPer100g ?? 0) / 100) * grams,
        carbs: totals.carbs + ((food.carbsPer100g ?? 0) / 100) * grams,
        fat: totals.fat + ((food.fatPer100g ?? 0) / 100) * grams,
      };
    },
    { protein: 0, carbs: 0, fat: 0 },
  );
}

/**
 * Calculate calories per serving.
 */
export function calculateCaloriesPerServing(totalCalories: number, servings: number): number {
  if (servings === 0) return 0;
  return totalCalories / servings;
}

/**
 * Macro balance score (0-1).
 * Evaluates macro ratio against common recommendations.
 */
export function calculateMacroBalance(protein: number, carbs: number, fat: number): number {
  const total = protein + carbs + fat;
  if (total === 0) return 0;

  const proteinPct = (protein / total) * 100;
  const carbsPct = (carbs / total) * 100;
  const fatPct = (fat / total) * 100;

  // Target: 30% protein, 40% carbs, 30% fat
  const proteinScore = 1 - Math.abs(proteinPct - 30) / 30;
  const carbsScore = 1 - Math.abs(carbsPct - 40) / 40;
  const fatScore = 1 - Math.abs(fatPct - 30) / 30;

  return Math.max(0, (proteinScore + carbsScore + fatScore) / 3);
}
