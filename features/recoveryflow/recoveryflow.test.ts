import { describe, it, expect } from "vitest";
import {
  calculateAverageSleep,
  calculateAverageSleepQuality,
  determineRecoveryStatus,
  assessRestBalance,
  generateRecoverySummary,
  calculateSleepDebt,
  calculateRecoveryScore,
} from "./recoveryflow";
import type { RecoveryCheckIn } from "./types";

describe("recoveryflow", () => {
  describe("calculateAverageSleep", () => {
    it("returns 0 for empty check-ins", () => {
      expect(calculateAverageSleep([])).toBe(0);
    });

    it("calculates average sleep hours correctly", () => {
      const checkIns: RecoveryCheckIn[] = [
        { date: new Date(), sleepHours: 6, sleepQuality: "good", restDays: 1 },
        { date: new Date(), sleepHours: 8, sleepQuality: "good", restDays: 1 },
        { date: new Date(), sleepHours: 7, sleepQuality: "good", restDays: 1 },
      ];
      expect(calculateAverageSleep(checkIns)).toBeCloseTo(7);
    });
  });

  describe("calculateAverageSleepQuality", () => {
    it("returns 0 for empty check-ins", () => {
      expect(calculateAverageSleepQuality([])).toBe(0);
    });

    it("calculates average quality correctly", () => {
      const checkIns: RecoveryCheckIn[] = [
        { date: new Date(), sleepHours: 7, sleepQuality: "excellent", restDays: 1 },
        { date: new Date(), sleepHours: 7, sleepQuality: "good", restDays: 1 },
      ];
      const avg = calculateAverageSleepQuality(checkIns);
      expect(avg).toBeCloseTo((4 + 3) / 2 / 4);
    });
  });

  describe("determineRecoveryStatus", () => {
    it("returns high for plenty of sleep", () => {
      expect(determineRecoveryStatus(9)).toBe("high");
    });

    it("returns moderate for recommended sleep", () => {
      expect(determineRecoveryStatus(7)).toBe("moderate");
    });

    it("returns low for insufficient sleep", () => {
      expect(determineRecoveryStatus(5)).toBe("low");
    });
  });

  describe("assessRestBalance", () => {
    it("flags overtraining with high training and low rest", () => {
      expect(assessRestBalance(1, 6)).toBe("overtraining");
    });

    it("flags underactive with very low rest", () => {
      expect(assessRestBalance(0, 2)).toBe("underactive");
    });

    it("returns balanced for healthy ratio", () => {
      expect(assessRestBalance(2, 4)).toBe("balanced");
    });
  });

  describe("generateRecoverySummary", () => {
    it("generates summary with correct shape", () => {
      const checkIns: RecoveryCheckIn[] = [
        { date: new Date(), sleepHours: 7, sleepQuality: "good", restDays: 2 },
      ];
      const summary = generateRecoverySummary(checkIns);
      expect(summary).toHaveProperty("averageSleepHours");
      expect(summary).toHaveProperty("averageSleepQuality");
      expect(summary).toHaveProperty("recoveryStatus");
      expect(summary).toHaveProperty("restBalance");
    });
  });

  describe("calculateSleepDebt", () => {
    it("returns 0 for adequate sleep", () => {
      expect(calculateSleepDebt(8, 7)).toBe(0);
    });

    it("calculates debt for insufficient sleep", () => {
      expect(calculateSleepDebt(6, 7)).toBeCloseTo(7);
    });

    it("accumulates over multiple days", () => {
      expect(calculateSleepDebt(5, 10)).toBeCloseTo(20);
    });
  });

  describe("calculateRecoveryScore", () => {
    it("returns 1 for perfect recovery", () => {
      const score = calculateRecoveryScore(8, 1, "balanced");
      expect(score).toBeCloseTo(1);
    });

    it("returns low score for poor recovery", () => {
      const score = calculateRecoveryScore(4, 0.2, "overtraining");
      expect(score).toBeLessThan(0.5);
    });

    it("penalizes overtraining", () => {
      const balanced = calculateRecoveryScore(7, 0.8, "balanced");
      const overtraining = calculateRecoveryScore(7, 0.8, "overtraining");
      expect(balanced).toBeGreaterThan(overtraining);
    });
  });
});
