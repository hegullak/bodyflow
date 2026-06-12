import { describe, expect, it } from "vitest";
import { addMealItemSchema } from "@/lib/validation/meal-item";

const baseByFoodId = {
  logDate: "2026-06-12",
  mealType: "breakfast",
  foodProductId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  quantityGrams: "150",
};

const baseByEan = {
  logDate: "2026-06-12",
  mealType: "lunch",
  ean: "12345678",
  quantityGrams: "100",
};

describe("addMealItemSchema", () => {
  it("accepts a valid entry identified by foodProductId", () => {
    expect(addMealItemSchema.safeParse(baseByFoodId).success).toBe(true);
  });

  it("accepts a valid entry identified by EAN", () => {
    expect(addMealItemSchema.safeParse(baseByEan).success).toBe(true);
  });

  it("accepts a valid entry identified by source + externalId", () => {
    const data = { ...baseByFoodId, foodProductId: "", source: "kassal", externalId: "12345" };
    expect(addMealItemSchema.safeParse(data).success).toBe(true);
  });

  it("rejects when no product reference is provided", () => {
    const { foodProductId, ...rest } = baseByFoodId;
    expect(addMealItemSchema.safeParse({ ...rest, foodProductId: "" }).success).toBe(false);
  });

  it("rejects an invalid logDate format", () => {
    expect(addMealItemSchema.safeParse({ ...baseByFoodId, logDate: "12-06-2026" }).success).toBe(false);
    expect(addMealItemSchema.safeParse({ ...baseByFoodId, logDate: "not-a-date" }).success).toBe(false);
  });

  it("rejects an invalid mealType", () => {
    expect(addMealItemSchema.safeParse({ ...baseByFoodId, mealType: "brunch" }).success).toBe(false);
  });

  it("rejects zero or negative quantityGrams", () => {
    expect(addMealItemSchema.safeParse({ ...baseByFoodId, quantityGrams: "0" }).success).toBe(false);
    expect(addMealItemSchema.safeParse({ ...baseByFoodId, quantityGrams: "-50" }).success).toBe(false);
  });

  it("rejects quantityGrams above 10000", () => {
    expect(addMealItemSchema.safeParse({ ...baseByFoodId, quantityGrams: "10001" }).success).toBe(false);
  });

  it("rejects a non-uuid foodProductId", () => {
    expect(addMealItemSchema.safeParse({ ...baseByFoodId, foodProductId: "not-a-uuid" }).success).toBe(false);
  });

  it("accepts all valid meal types", () => {
    const types = ["breakfast", "lunch", "snack", "dinner", "evening", "smoke"];
    for (const mealType of types) {
      expect(addMealItemSchema.safeParse({ ...baseByFoodId, mealType }).success).toBe(true);
    }
  });
});
