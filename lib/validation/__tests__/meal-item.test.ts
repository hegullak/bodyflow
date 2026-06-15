import { describe, it, expect } from "vitest";
import { addMealItemSchema, mealTypeSchema } from "../meal-item";

describe("mealTypeSchema", () => {
  it("accepts all defined meal types", () => {
    for (const t of ["breakfast", "lunch", "snack", "dinner", "evening", "smoke"]) {
      expect(mealTypeSchema.safeParse(t).success).toBe(true);
    }
  });
  it("rejects unknown meal type", () => {
    expect(mealTypeSchema.safeParse("brunch").success).toBe(false);
  });
  it("rejects empty string", () => {
    expect(mealTypeSchema.safeParse("").success).toBe(false);
  });
});

const UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("addMealItemSchema", () => {
  const base = {
    logDate: "2026-06-15",
    mealType: "lunch",
    foodProductId: UUID,
    quantityGrams: "150",
  };

  it("accepts valid input with foodProductId", () => {
    expect(addMealItemSchema.safeParse(base).success).toBe(true);
  });

  it("accepts valid input with EAN as product reference", () => {
    const input = { ...base, foodProductId: "", ean: "12345678" };
    expect(addMealItemSchema.safeParse(input).success).toBe(true);
  });

  it("accepts valid input with source + externalId as product reference", () => {
    const input = { ...base, foodProductId: "", source: "kassal", externalId: "abc123" };
    expect(addMealItemSchema.safeParse(input).success).toBe(true);
  });

  it("coerces quantityGrams string to number", () => {
    const result = addMealItemSchema.safeParse(base);
    expect(result.success && result.data.quantityGrams).toBe(150);
  });

  it("rejects when no product reference is provided", () => {
    const input = { logDate: "2026-06-15", mealType: "lunch", quantityGrams: "150" };
    expect(addMealItemSchema.safeParse(input).success).toBe(false);
  });

  it("rejects logDate in wrong format", () => {
    expect(addMealItemSchema.safeParse({ ...base, logDate: "15-06-2026" }).success).toBe(false);
    expect(addMealItemSchema.safeParse({ ...base, logDate: "2026/06/15" }).success).toBe(false);
  });

  it("rejects invalid meal type", () => {
    expect(addMealItemSchema.safeParse({ ...base, mealType: "brunch" }).success).toBe(false);
  });

  it("rejects zero quantity", () => {
    expect(addMealItemSchema.safeParse({ ...base, quantityGrams: "0" }).success).toBe(false);
  });

  it("rejects negative quantity", () => {
    expect(addMealItemSchema.safeParse({ ...base, quantityGrams: "-50" }).success).toBe(false);
  });

  it("rejects quantity above 10000g", () => {
    expect(addMealItemSchema.safeParse({ ...base, quantityGrams: "10001" }).success).toBe(false);
  });

  it("accepts quantity at the 10000g upper boundary", () => {
    expect(addMealItemSchema.safeParse({ ...base, quantityGrams: "10000" }).success).toBe(true);
  });

  it("rejects EAN shorter than 8 digits", () => {
    const input = { ...base, foodProductId: "", ean: "1234567" };
    expect(addMealItemSchema.safeParse(input).success).toBe(false);
  });

  it("rejects EAN longer than 14 digits", () => {
    const input = { ...base, foodProductId: "", ean: "123456789012345" };
    expect(addMealItemSchema.safeParse(input).success).toBe(false);
  });

  it("rejects source without externalId as sole reference", () => {
    const input = { ...base, foodProductId: "", source: "kassal" };
    expect(addMealItemSchema.safeParse(input).success).toBe(false);
  });
});
