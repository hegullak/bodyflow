import { describe, it, expect } from "vitest";
import {
  calculateAverageEnergy,
  calculateAverageFatigue,
  detectEnergyTrend,
  recommendAction,
  generateBatterySummary,
  calculateBatteryPercentage,
  estimateRecoveryTime,
} from "./batteryflow";
import type { BatteryCheckIn } from "./types";

describe("batteryflow", () => {
  describe("calculateAverageEnergy", () => {
    it("returns 0 for empty check-ins", () => {
      expect(calculateAverageEnergy([])).toBe(0);
    });

    it("calculates average energy correctly", () => {
      const checkIns: BatteryCheckIn[] = [
        { date: new Date(), energyLevel: "peak", fatigue: 2 },
        { date: new Date(), energyLevel: "high", fatigue: 3 },
        { date: new Date(), energyLevel: "moderate", fatigue: 4 },
      ];
      const avg = calculateAverageEnergy(checkIns);
      expect(avg).toBeCloseTo((5 + 4 + 3) / 3 / 5);
    });
  });

  describe("calculateAverageFatigue", () => {
    it("returns 0 for empty check-ins", () => {
      expect(calculateAverageFatigue([])).toBe(0);
    });

    it("calculates average fatigue correctly", () => {
      const checkIns: BatteryCheckIn[] = [
        { date: new Date(), energyLevel: "high", fatigue: 2 },
        { date: new Date(), energyLevel: "high", fatigue: 8 },
      ];
      const avg = calculateAverageFatigue(checkIns);
      expect(avg).toBeCloseTo(5 / 10);
    });
  });

  describe("detectEnergyTrend", () => {
    it("returns stable for less than 2 check-ins", () => {
      expect(detectEnergyTrend([])).toBe("stable");
      expect(detectEnergyTrend([{ date: new Date(), energyLevel: "high", fatigue: 3 }])).toBe(
        "stable",
      );
    });

    it("detects depleting trend", () => {
      const checkIns: BatteryCheckIn[] = [
        { date: new Date(), energyLevel: "peak", fatigue: 1 },
        { date: new Date(), energyLevel: "moderate", fatigue: 5 },
      ];
      expect(detectEnergyTrend(checkIns)).toBe("depleting");
    });

    it("detects recovering trend", () => {
      const checkIns: BatteryCheckIn[] = [
        { date: new Date(), energyLevel: "depleted", fatigue: 9 },
        { date: new Date(), energyLevel: "high", fatigue: 2 },
      ];
      expect(detectEnergyTrend(checkIns)).toBe("recovering");
    });
  });

  describe("recommendAction", () => {
    it("recommends rest when fatigued", () => {
      expect(recommendAction(0.5, 0.8)).toBe("rest");
    });

    it("recommends rest when low energy", () => {
      expect(recommendAction(0.2, 0.4)).toBe("rest");
    });

    it("recommends push when high energy and fresh", () => {
      expect(recommendAction(0.9, 0.1)).toBe("push");
    });

    it("recommends maintain for moderate state", () => {
      expect(recommendAction(0.5, 0.5)).toBe("maintain");
    });
  });

  describe("generateBatterySummary", () => {
    it("generates summary with correct shape", () => {
      const checkIns: BatteryCheckIn[] = [
        { date: new Date(), energyLevel: "high", fatigue: 3 },
      ];
      const summary = generateBatterySummary(checkIns);
      expect(summary).toHaveProperty("averageEnergy");
      expect(summary).toHaveProperty("averageFatigue");
      expect(summary).toHaveProperty("energyTrend");
      expect(summary).toHaveProperty("recommendAction");
    });
  });

  describe("calculateBatteryPercentage", () => {
    it("returns 100 for peak energy and no fatigue", () => {
      const score = calculateBatteryPercentage(1, 0);
      expect(score).toBe(100);
    });

    it("returns 0 for no energy and full fatigue", () => {
      const score = calculateBatteryPercentage(0, 1);
      expect(score).toBe(0);
    });

    it("calculates reasonable score for average state", () => {
      const score = calculateBatteryPercentage(0.7, 0.3);
      expect(score).toBeGreaterThan(50);
      expect(score).toBeLessThan(100);
    });
  });

  describe("estimateRecoveryTime", () => {
    it("returns 0 for no fatigue", () => {
      expect(estimateRecoveryTime(0)).toBe(0);
    });

    it("estimates recovery time based on fatigue", () => {
      const time = estimateRecoveryTime(0.5);
      expect(time).toBeGreaterThan(0);
    });

    it("increases with higher fatigue", () => {
      const time1 = estimateRecoveryTime(0.3);
      const time2 = estimateRecoveryTime(0.7);
      expect(time2).toBeGreaterThan(time1);
    });
  });
});
