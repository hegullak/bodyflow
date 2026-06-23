import { describe, it, expect } from "vitest";
import {
  calculateMealCalories,
  calculateMacros,
  calculateCaloriePercentage,
  calculateRemainingCalories,
  calculateRecipeCalories,
  calculateRecipeMacros,
  calculateCaloriesPerServing,
  calculateMacroBalance,
  type MealItem,
  type RecipeFood,
} from "./nutritionCalc";

describe("nutritionCalc", () => {
  describe("calculateMealCalories", () => {
    it("returns 0 for empty items", () => {
      expect(calculateMealCalories([])).toBe(0);
    });

    it("sums meal item calories", () => {
      const items: MealItem[] = [
        { id: "1", caloriesKcal: 100 },
        { id: "2", caloriesKcal: 250 },
        { id: "3", caloriesKcal: 150 },
      ];
      expect(calculateMealCalories(items)).toBe(500);
    });
  });

  describe("calculateMacros", () => {
    it("sums macro nutrients", () => {
      const items: MealItem[] = [
        { id: "1", caloriesKcal: 100, protein: 20, carbs: 30, fat: 5 },
        { id: "2", caloriesKcal: 200, protein: 10, carbs: 40, fat: 8 },
      ];
      const macros = calculateMacros(items);
      expect(macros.protein).toBe(30);
      expect(macros.carbs).toBe(70);
      expect(macros.fat).toBe(13);
    });

    it("handles missing macro values", () => {
      const items: MealItem[] = [
        { id: "1", caloriesKcal: 100, protein: 20 },
        { id: "2", caloriesKcal: 200 },
      ];
      const macros = calculateMacros(items);
      expect(macros.protein).toBe(20);
      expect(macros.carbs).toBe(0);
    });
  });

  describe("calculateCaloriePercentage", () => {
    it("calculates percentage of target", () => {
      expect(calculateCaloriePercentage(500, 2000)).toBe(25);
      expect(calculateCaloriePercentage(2000, 2000)).toBe(100);
    });

    it("caps at 100%", () => {
      expect(calculateCaloriePercentage(2500, 2000)).toBe(100);
    });

    it("handles zero target", () => {
      expect(calculateCaloriePercentage(100, 0)).toBe(0);
    });
  });

  describe("calculateRemainingCalories", () => {
    it("calculates remaining budget", () => {
      expect(calculateRemainingCalories(500, 2000)).toBe(1500);
    });

    it("returns 0 when over budget", () => {
      expect(calculateRemainingCalories(2500, 2000)).toBe(0);
    });
  });

  describe("calculateRecipeCalories", () => {
    it("calculates recipe total from foods", () => {
      const foods: RecipeFood[] = [
        { foodId: "1", quantityGrams: 100, kcalPer100g: 150 },
        { foodId: "2", quantityGrams: 200, kcalPer100g: 100 },
      ];
      expect(calculateRecipeCalories(foods)).toBe(150 + 200);
    });

    it("handles empty recipe", () => {
      expect(calculateRecipeCalories([])).toBe(0);
    });
  });

  describe("calculateRecipeMacros", () => {
    it("calculates macros from recipe foods", () => {
      const foods: RecipeFood[] = [
        { foodId: "1", quantityGrams: 100, kcalPer100g: 150, proteinPer100g: 20 },
        { foodId: "2", quantityGrams: 100, kcalPer100g: 100, proteinPer100g: 10 },
      ];
      const macros = calculateRecipeMacros(foods);
      expect(macros.protein).toBe(20 + 10);
    });
  });

  describe("calculateCaloriesPerServing", () => {
    it("divides total by servings", () => {
      expect(calculateCaloriesPerServing(1000, 4)).toBe(250);
    });

    it("handles zero servings", () => {
      expect(calculateCaloriesPerServing(1000, 0)).toBe(0);
    });
  });

  describe("calculateMacroBalance", () => {
    it("returns 1 for ideal macro ratio", () => {
      // 30% protein, 40% carbs, 30% fat
      const score = calculateMacroBalance(30, 40, 30);
      expect(score).toBeCloseTo(1, 1);
    });

    it("returns 0 for zero macros", () => {
      expect(calculateMacroBalance(0, 0, 0)).toBe(0);
    });

    it("penalizes unbalanced ratios", () => {
      const balanced = calculateMacroBalance(30, 40, 30);
      const unbalanced = calculateMacroBalance(60, 30, 10);
      expect(balanced).toBeGreaterThan(unbalanced);
    });
  });
});
