import { describe, expect, it } from "vitest";
import { profileFormSchema } from "@/lib/validation/profile";

describe("profileFormSchema", () => {
  const valid = {
    sex: "male",
    birthYear: "1990",
    heightCm: "178",
    activityLevel: "moderate",
    goal: "maintenance",
    preferredUnits: "metric",
  };

  it("accepts a fully populated valid payload", () => {
    const result = profileFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts optional fields omitted", () => {
    const { sex, birthYear, ...minimal } = valid;
    const result = profileFormSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it("rejects missing heightCm", () => {
    const { heightCm, ...rest } = valid;
    const result = profileFormSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects heightCm above 300", () => {
    const result = profileFormSchema.safeParse({ ...valid, heightCm: "301" });
    expect(result.success).toBe(false);
  });

  it("rejects negative heightCm", () => {
    const result = profileFormSchema.safeParse({ ...valid, heightCm: "-1" });
    expect(result.success).toBe(false);
  });

  it("rejects birthYear outside valid range", () => {
    expect(profileFormSchema.safeParse({ ...valid, birthYear: "1899" }).success).toBe(false);
    expect(profileFormSchema.safeParse({ ...valid, birthYear: "2200" }).success).toBe(false);
  });

  it("treats empty birthYear as undefined (optional)", () => {
    const result = profileFormSchema.safeParse({ ...valid, birthYear: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.birthYear).toBeUndefined();
  });

  it("rejects an unknown sex value", () => {
    const result = profileFormSchema.safeParse({ ...valid, sex: "attack_helicopter" });
    expect(result.success).toBe(false);
  });

  it("rejects dailyCalorieTarget outside 500–10000", () => {
    expect(profileFormSchema.safeParse({ ...valid, dailyCalorieTarget: "499" }).success).toBe(false);
    expect(profileFormSchema.safeParse({ ...valid, dailyCalorieTarget: "10001" }).success).toBe(false);
  });

  it("rejects invalid activityLevel", () => {
    const result = profileFormSchema.safeParse({ ...valid, activityLevel: "ninja" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid goal", () => {
    const result = profileFormSchema.safeParse({ ...valid, goal: "become_rich" });
    expect(result.success).toBe(false);
  });
});
