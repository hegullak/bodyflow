import { describe, it, expect } from "vitest";
import {
  calculateAverageMood,
  calculateAverageStress,
  detectMoodTrend,
  generateMentalSummary,
  calculateWellnessScore,
} from "./mentalflow";
import type { MentalCheckIn } from "./types";

describe("mentalflow", () => {
  describe("calculateAverageMood", () => {
    it("returns 0 for empty check-ins", () => {
      expect(calculateAverageMood([])).toBe(0);
    });

    it("calculates average mood correctly", () => {
      const checkIns: MentalCheckIn[] = [
        { date: new Date(), mood: "excellent", stress: "low" },
        { date: new Date(), mood: "good", stress: "low" },
        { date: new Date(), mood: "neutral", stress: "low" },
      ];
      const avg = calculateAverageMood(checkIns);
      expect(avg).toBeCloseTo((5 + 4 + 3) / 3 / 5);
    });

    it("handles all mood levels", () => {
      const moods = ["poor", "low", "neutral", "good", "excellent"] as const;
      for (let i = 0; i < moods.length; i++) {
        const checkIns: MentalCheckIn[] = [
          { date: new Date(), mood: moods[i], stress: "low" },
        ];
        const avg = calculateAverageMood(checkIns);
        expect(avg).toBeCloseTo((i + 1) / 5);
      }
    });
  });

  describe("calculateAverageStress", () => {
    it("returns 0 for empty check-ins", () => {
      expect(calculateAverageStress([])).toBe(0);
    });

    it("calculates average stress correctly", () => {
      const checkIns: MentalCheckIn[] = [
        { date: new Date(), mood: "good", stress: "high" },
        { date: new Date(), mood: "good", stress: "low" },
      ];
      const avg = calculateAverageStress(checkIns);
      expect(avg).toBeCloseTo((1 + 3) / 2 / 4);
    });
  });

  describe("detectMoodTrend", () => {
    it("returns stable for less than 2 check-ins", () => {
      expect(detectMoodTrend([])).toBe("stable");
      expect(detectMoodTrend([{ date: new Date(), mood: "good", stress: "low" }])).toBe("stable");
    });

    it("detects improving trend", () => {
      const checkIns: MentalCheckIn[] = [
        { date: new Date("2024-01-01"), mood: "poor", stress: "high" },
        { date: new Date("2024-01-02"), mood: "low", stress: "high" },
        { date: new Date("2024-01-03"), mood: "good", stress: "low" },
        { date: new Date("2024-01-04"), mood: "excellent", stress: "low" },
      ];
      expect(detectMoodTrend(checkIns)).toBe("improving");
    });

    it("detects declining trend", () => {
      const checkIns: MentalCheckIn[] = [
        { date: new Date("2024-01-01"), mood: "excellent", stress: "low" },
        { date: new Date("2024-01-02"), mood: "good", stress: "low" },
        { date: new Date("2024-01-03"), mood: "low", stress: "high" },
        { date: new Date("2024-01-04"), mood: "poor", stress: "high" },
      ];
      expect(detectMoodTrend(checkIns)).toBe("declining");
    });

    it("detects stable trend when similar", () => {
      const checkIns: MentalCheckIn[] = [
        { date: new Date("2024-01-01"), mood: "good", stress: "low" },
        { date: new Date("2024-01-02"), mood: "good", stress: "low" },
        { date: new Date("2024-01-03"), mood: "good", stress: "low" },
        { date: new Date("2024-01-04"), mood: "good", stress: "low" },
      ];
      expect(detectMoodTrend(checkIns)).toBe("stable");
    });
  });

  describe("generateMentalSummary", () => {
    it("generates summary with correct shape", () => {
      const checkIns: MentalCheckIn[] = [
        { date: new Date(), mood: "good", stress: "low" },
      ];
      const summary = generateMentalSummary(checkIns);
      expect(summary).toHaveProperty("averageMood");
      expect(summary).toHaveProperty("averageStress");
      expect(summary).toHaveProperty("moodTrend");
      expect(summary).toHaveProperty("recentCheckIns");
    });

    it("includes only recent check-ins (max 7)", () => {
      const checkIns: MentalCheckIn[] = Array.from({ length: 20 }, (_, i) => ({
        date: new Date(),
        mood: "good" as const,
        stress: "low" as const,
      }));
      const summary = generateMentalSummary(checkIns);
      expect(summary.recentCheckIns.length).toBeLessThanOrEqual(7);
    });
  });

  describe("calculateWellnessScore", () => {
    it("returns value between 0 and 1", () => {
      const score = calculateWellnessScore("excellent", "minimal");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("excellent mood gives higher score than poor mood", () => {
      const excellent = calculateWellnessScore("excellent", "high");
      const poor = calculateWellnessScore("poor", "high");
      expect(excellent).toBeGreaterThan(poor);
    });

    it("minimal stress gives higher score than high stress", () => {
      const minimal = calculateWellnessScore("neutral", "minimal");
      const high = calculateWellnessScore("neutral", "high");
      expect(minimal).toBeGreaterThan(high);
    });
  });
});
