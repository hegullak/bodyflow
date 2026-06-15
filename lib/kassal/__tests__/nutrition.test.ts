import { describe, it, expect } from "vitest";
import {
  kjToKcal,
  calculateCaloriesFromGrams,
  getKcalPer100g,
  packageWeightToGrams,
} from "../nutrition";
import type { KassalNutritionItem } from "../types";

function n(code: string, display_name: string, amount: number, unit: string): KassalNutritionItem {
  return { code, display_name, amount, unit };
}

describe("kjToKcal", () => {
  it("converts kJ to kcal using standard factor", () => {
    expect(kjToKcal(418.4)).toBeCloseTo(100, 1);
  });
  it("returns 0 for 0 kJ", () => {
    expect(kjToKcal(0)).toBe(0);
  });
  it("handles large values", () => {
    expect(kjToKcal(8368)).toBeCloseTo(2000, 0);
  });
});

describe("calculateCaloriesFromGrams", () => {
  it("calculates proportionally from 100g base", () => {
    expect(calculateCaloriesFromGrams(200, 50)).toBe(100);
  });
  it("rounds to nearest integer", () => {
    expect(calculateCaloriesFromGrams(333, 100)).toBe(333);
    expect(calculateCaloriesFromGrams(100, 33)).toBe(33);
  });
  it("returns 0 for zero quantity", () => {
    expect(calculateCaloriesFromGrams(500, 0)).toBe(0);
  });
  it("handles typical food values correctly", () => {
    expect(calculateCaloriesFromGrams(352, 80)).toBe(282);
  });
});

describe("packageWeightToGrams", () => {
  it("passes through grams unchanged", () => {
    expect(packageWeightToGrams(500, "g")).toBe(500);
  });
  it("converts kg to grams", () => {
    expect(packageWeightToGrams(1.5, "kg")).toBe(1500);
  });
  it("converts hg to grams", () => {
    expect(packageWeightToGrams(2, "hg")).toBe(200);
  });
  it("treats ml as grams (1:1)", () => {
    expect(packageWeightToGrams(250, "ml")).toBe(250);
  });
  it("converts cl to ml", () => {
    expect(packageWeightToGrams(33, "cl")).toBe(330);
  });
  it("converts dl to ml", () => {
    expect(packageWeightToGrams(2.5, "dl")).toBe(250);
  });
  it("converts l to ml", () => {
    expect(packageWeightToGrams(1, "l")).toBe(1000);
  });
  it("is case-insensitive for unit", () => {
    expect(packageWeightToGrams(500, "G")).toBe(500);
    expect(packageWeightToGrams(1, "KG")).toBe(1000);
  });
  it("returns null for unknown unit", () => {
    expect(packageWeightToGrams(100, "oz")).toBeNull();
  });
  it("returns null for null weight", () => {
    expect(packageWeightToGrams(null, "g")).toBeNull();
  });
  it("returns null for undefined weight", () => {
    expect(packageWeightToGrams(undefined, "g")).toBeNull();
  });
  it("returns null for null unit", () => {
    expect(packageWeightToGrams(100, null)).toBeNull();
  });
});

describe("getKcalPer100g", () => {
  it("extracts kcal directly from a kcal item", () => {
    expect(getKcalPer100g([n("energi_kcal", "Energi (kcal)", 352, "kcal")])).toBe(352);
  });
  it("accepts kkal as kcal unit", () => {
    expect(getKcalPer100g([n("energi", "Energi", 250, "kkal")])).toBe(250);
  });
  it("converts kJ to kcal when only kJ is present", () => {
    const result = getKcalPer100g([n("energi_kj", "Energi (kJ)", 418.4, "kJ")]);
    expect(result).toBeCloseTo(100, 0);
  });
  it("prefers kcal item over kJ item when both present", () => {
    const items = [
      n("energi_kj", "Energi (kJ)", 418.4, "kJ"),
      n("energi_kcal", "Energi (kcal)", 100, "kcal"),
    ];
    expect(getKcalPer100g(items)).toBe(100);
  });
  it("returns null for empty nutrition list", () => {
    expect(getKcalPer100g([])).toBeNull();
  });
  it("returns null when no energy item is present", () => {
    const items = [n("protein", "Protein", 20, "g"), n("fett", "Fett", 10, "g")];
    expect(getKcalPer100g(items)).toBeNull();
  });
  it("matches by display_name containing 'energi'", () => {
    expect(getKcalPer100g([n("en", "Energi", 200, "kcal")])).toBe(200);
  });
});
