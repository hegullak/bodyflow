import { describe, it, expect } from "vitest";
import {
  calculateAverageWeight,
  detectWeightTrend,
  calculateWeeklyAverage,
  calculateWeightChange,
  calculateWeightChangePercentage,
  estimateTimeToGoal,
  calculateStabilityScore,
  isHealthyBMI,
  calculateBMI,
  type WeightRecord,
} from "./weightTrend";

describe("weightTrend", () => {
  describe("calculateAverageWeight", () => {
    it("returns 0 for empty records", () => {
      expect(calculateAverageWeight([])).toBe(0);
    });

    it("calculates average weight", () => {
      const records: WeightRecord[] = [
        { date: new Date("2024-01-01"), weightKg: 70 },
        { date: new Date("2024-01-02"), weightKg: 71 },
        { date: new Date("2024-01-03"), weightKg: 69 },
      ];
      expect(calculateAverageWeight(records)).toBeCloseTo(70);
    });
  });

  describe("detectWeightTrend", () => {
    it("returns stable for less than 2 records", () => {
      expect(detectWeightTrend([])).toBe("stable");
      expect(detectWeightTrend([{ date: new Date(), weightKg: 70 }])).toBe("stable");
    });

    it("detects gaining trend", () => {
      const records: WeightRecord[] = [
        { date: new Date("2024-01-01"), weightKg: 68 },
        { date: new Date("2024-01-02"), weightKg: 68 },
        { date: new Date("2024-01-03"), weightKg: 72 },
        { date: new Date("2024-01-04"), weightKg: 72 },
      ];
      expect(detectWeightTrend(records)).toBe("gaining");
    });

    it("detects losing trend", () => {
      const records: WeightRecord[] = [
        { date: new Date("2024-01-01"), weightKg: 72 },
        { date: new Date("2024-01-02"), weightKg: 72 },
        { date: new Date("2024-01-03"), weightKg: 68 },
        { date: new Date("2024-01-04"), weightKg: 68 },
      ];
      expect(detectWeightTrend(records)).toBe("losing");
    });
  });

  describe("calculateWeightChange", () => {
    it("calculates change from start to end", () => {
      expect(calculateWeightChange(70, 72)).toBe(2);
      expect(calculateWeightChange(72, 70)).toBe(-2);
    });
  });

  describe("calculateWeightChangePercentage", () => {
    it("calculates percentage change", () => {
      expect(calculateWeightChangePercentage(100, 110)).toBe(10);
      expect(calculateWeightChangePercentage(100, 90)).toBe(-10);
    });

    it("handles zero start weight", () => {
      expect(calculateWeightChangePercentage(0, 10)).toBe(0);
    });
  });

  describe("estimateTimeToGoal", () => {
    it("estimates weeks to goal", () => {
      const weeks = estimateTimeToGoal(80, 70, -1);
      expect(weeks).toBe(10);
    });

    it("returns null for zero weekly change", () => {
      expect(estimateTimeToGoal(80, 70, 0)).toBeNull();
    });

    it("handles positive goal weight", () => {
      const weeks = estimateTimeToGoal(70, 80, 0.5);
      expect(weeks).toBe(20);
    });
  });

  describe("calculateStabilityScore", () => {
    it("returns 1 for constant weight", () => {
      const records: WeightRecord[] = [
        { date: new Date(), weightKg: 70 },
        { date: new Date(), weightKg: 70 },
        { date: new Date(), weightKg: 70 },
      ];
      expect(calculateStabilityScore(records)).toBeCloseTo(1);
    });

    it("penalizes variance", () => {
      const stable: WeightRecord[] = [
        { date: new Date(), weightKg: 70 },
        { date: new Date(), weightKg: 70.1 },
        { date: new Date(), weightKg: 69.9 },
      ];
      const unstable: WeightRecord[] = [
        { date: new Date(), weightKg: 60 },
        { date: new Date(), weightKg: 70 },
        { date: new Date(), weightKg: 80 },
      ];
      expect(calculateStabilityScore(stable)).toBeGreaterThan(calculateStabilityScore(unstable));
    });
  });

  describe("calculateBMI", () => {
    it("calculates BMI correctly", () => {
      const bmi = calculateBMI(70, 1.75);
      expect(bmi).toBeCloseTo(22.86, 1);
    });

    it("handles zero height", () => {
      expect(calculateBMI(70, 0)).toBe(0);
    });
  });

  describe("isHealthyBMI", () => {
    it("returns true for healthy BMI", () => {
      expect(isHealthyBMI(70, 1.75)).toBe(true);
    });

    it("returns false for underweight", () => {
      expect(isHealthyBMI(45, 1.75)).toBe(false);
    });

    it("returns false for overweight", () => {
      expect(isHealthyBMI(95, 1.75)).toBe(false);
    });
  });
});
