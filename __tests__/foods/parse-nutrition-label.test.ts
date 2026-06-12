import { describe, expect, it } from "vitest";
import {
  parseEanFromText,
  parseKcalPer100gFromText,
  parseNutritionLabelText,
} from "@/lib/foods/parse-nutrition-label";

describe("parseKcalPer100gFromText", () => {
  it("reads kcal per 100g from Norwegian labels", () => {
    expect(parseKcalPer100gFromText("Energi 450 kcal per 100 g")).toBe(450);
    expect(parseKcalPer100gFromText("Næringsinnhold per 100g: Energi 312 kcal")).toBe(312);
  });

  it("converts kJ to kcal", () => {
    expect(parseKcalPer100gFromText("Energi 2090 kJ per 100 g")).toBe(500);
  });
});

describe("parseEanFromText", () => {
  it("finds EAN in OCR text", () => {
    expect(parseEanFromText("EAN 7039010019811")).toBe("7039010019811");
  });
});

describe("parseNutritionLabelText", () => {
  it("combines fields from OCR text", () => {
    const parsed = parseNutritionLabelText(
      "Grandiosa Pizza\nEnergi 250 kcal per 100 g\n7039010019811",
      null,
    );
    expect(parsed.kcalPer100g).toBe(250);
    expect(parsed.ean).toBe("7039010019811");
  });
});
