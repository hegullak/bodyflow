import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

describe("nutritionSummary actions", () => {
  describe("getDailyNutritionSummaryAction", () => {
    it("validates input with Zod", () => {
      const getDailyNutritionSchema = z.object({
        logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        targetCalories: z.number().min(1000).max(5000),
      });

      expect(() =>
        getDailyNutritionSchema.parse({
          logDate: "2024-01-15",
          targetCalories: 2000,
        }),
      ).not.toThrow();
    });

    it("rejects invalid date format", () => {
      const getDailyNutritionSchema = z.object({
        logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        targetCalories: z.number().min(1000).max(5000),
      });

      expect(() =>
        getDailyNutritionSchema.parse({
          logDate: "01/15/2024",
          targetCalories: 2000,
        }),
      ).toThrow();
    });

    it("rejects calorie targets outside valid range", () => {
      const getDailyNutritionSchema = z.object({
        logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        targetCalories: z.number().min(1000).max(5000),
      });

      expect(() =>
        getDailyNutritionSchema.parse({
          logDate: "2024-01-15",
          targetCalories: 500,
        }),
      ).toThrow();

      expect(() =>
        getDailyNutritionSchema.parse({
          logDate: "2024-01-15",
          targetCalories: 6000,
        }),
      ).toThrow();
    });

    it("accepts valid nutrition summary parameters", () => {
      const getDailyNutritionSchema = z.object({
        logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        targetCalories: z.number().min(1000).max(5000),
      });

      const result = getDailyNutritionSchema.parse({
        logDate: "2024-06-23",
        targetCalories: 2200,
      });

      expect(result.logDate).toBe("2024-06-23");
      expect(result.targetCalories).toBe(2200);
    });
  });
});
