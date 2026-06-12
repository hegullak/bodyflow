import { describe, expect, it } from "vitest";
import {
  calculateCaloriesFromGrams,
  getKcalPer100g,
  kjToKcal,
  packageWeightToGrams,
} from "@/lib/kassal/nutrition";

describe("getKcalPer100g", () => {
  it("reads kcal values directly", () => {
    expect(
      getKcalPer100g([
        { code: "energy_kcal", display_name: "Energi", amount: 250, unit: "kcal" },
      ]),
    ).toBe(250);
  });

  it("converts kJ to kcal", () => {
    expect(
      getKcalPer100g([
        { code: "energy_kj", display_name: "Energi", amount: 1046, unit: "kJ" },
      ]),
    ).toBeCloseTo(250, 0);
  });
});

describe("calculateCaloriesFromGrams", () => {
  it("scales per 100 g", () => {
    expect(calculateCaloriesFromGrams(250, 150)).toBe(375);
  });
});

describe("kjToKcal", () => {
  it("converts using 4.184", () => {
    expect(kjToKcal(418.4)).toBeCloseTo(100, 1);
  });
});

describe("packageWeightToGrams", () => {
  it("converts common units", () => {
    expect(packageWeightToGrams(500, "g")).toBe(500);
    expect(packageWeightToGrams(1, "kg")).toBe(1000);
    expect(packageWeightToGrams(250, "ml")).toBe(250);
  });
});
