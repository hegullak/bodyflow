import { describe, it, expect } from "vitest";
import {
  calculateTrainingVolume,
  calculateIntensity,
  calculateAcuteLoad,
  calculateChronicLoad,
  calculateTSB,
  calculateRecoveryDemand,
  estimateRecoveryTime,
  needsRestDay,
} from "./trainingLoad";

describe("trainingLoad", () => {
  describe("calculateTrainingVolume", () => {
    it("multiplies reps by weight", () => {
      expect(calculateTrainingVolume(100, 50)).toBe(5000);
      expect(calculateTrainingVolume(0, 50)).toBe(0);
    });
  });

  describe("calculateIntensity", () => {
    it("returns 0 for zero duration", () => {
      expect(calculateIntensity(0, 1000, 5)).toBe(0);
    });

    it("calculates intensity from volume and density", () => {
      const intensity = calculateIntensity(60, 12000, 6);
      expect(intensity).toBeGreaterThan(0);
      expect(intensity).toBeLessThanOrEqual(1);
    });

    it("higher volume increases intensity", () => {
      const low = calculateIntensity(60, 6000, 6);
      const high = calculateIntensity(60, 12000, 6);
      expect(high).toBeGreaterThan(low);
    });
  });

  describe("calculateAcuteLoad", () => {
    it("calculates acute load from session parameters", () => {
      const load = calculateAcuteLoad(60, 0.5, 5);
      expect(load).toBeGreaterThan(0);
      expect(load).toBeLessThanOrEqual(100);
    });

    it("longer duration increases load", () => {
      const shortSession = calculateAcuteLoad(30, 0.5, 5);
      const longSession = calculateAcuteLoad(90, 0.5, 5);
      expect(longSession).toBeGreaterThan(shortSession);
    });

    it("higher intensity increases load", () => {
      const lowIntensity = calculateAcuteLoad(60, 0.3, 5);
      const highIntensity = calculateAcuteLoad(60, 0.8, 5);
      expect(highIntensity).toBeGreaterThan(lowIntensity);
    });
  });

  describe("calculateChronicLoad", () => {
    it("returns 0 for empty array", () => {
      expect(calculateChronicLoad([])).toBe(0);
    });

    it("weights recent sessions more heavily", () => {
      const loads = [20, 40, 60];
      const chronic = calculateChronicLoad(loads);
      expect(chronic).toBeGreaterThan(40);
      expect(chronic).toBeLessThanOrEqual(60);
    });
  });

  describe("calculateTSB", () => {
    it("returns positive when fresh", () => {
      const tsb = calculateTSB(30, 50);
      expect(tsb).toBe(20);
    });

    it("returns negative when fatigued", () => {
      const tsb = calculateTSB(60, 40);
      expect(tsb).toBe(-20);
    });
  });

  describe("calculateRecoveryDemand", () => {
    it("returns value between 0 and 1", () => {
      const demand = calculateRecoveryDemand(0.5, 60);
      expect(demand).toBeGreaterThanOrEqual(0);
      expect(demand).toBeLessThanOrEqual(1);
    });

    it("higher intensity increases demand", () => {
      const low = calculateRecoveryDemand(0.3, 60);
      const high = calculateRecoveryDemand(0.8, 60);
      expect(high).toBeGreaterThan(low);
    });

    it("longer duration increases demand", () => {
      const short = calculateRecoveryDemand(0.5, 30);
      const long = calculateRecoveryDemand(0.5, 120);
      expect(long).toBeGreaterThan(short);
    });
  });

  describe("estimateRecoveryTime", () => {
    it("estimates recovery time in hours", () => {
      const hours = estimateRecoveryTime(0.5, 5000);
      expect(hours).toBeGreaterThan(0);
    });

    it("higher intensity increases recovery time", () => {
      const light = estimateRecoveryTime(0.3, 3000);
      const heavy = estimateRecoveryTime(0.9, 3000);
      expect(heavy).toBeGreaterThan(light);
    });
  });

  describe("needsRestDay", () => {
    it("returns true after 5+ consecutive workout days", () => {
      expect(needsRestDay([50, 50, 50, 50, 50], 5)).toBe(true);
    });

    it("returns true for high load + 3 consecutive days", () => {
      expect(needsRestDay([75, 80, 70], 3)).toBe(true);
    });

    it("returns false for reasonable training", () => {
      expect(needsRestDay([40, 50], 2)).toBe(false);
    });

    it("returns false for single workout day", () => {
      expect(needsRestDay([60], 1)).toBe(false);
    });
  });
});
