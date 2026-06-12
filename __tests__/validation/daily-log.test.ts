import { describe, expect, it } from "vitest";
import { dailyLogFormSchema } from "@/lib/validation/daily-log";

describe("dailyLogFormSchema", () => {
  it("accepts weight only", () => {
    const r = dailyLogFormSchema.safeParse({ logDate: "2026-06-12", weightKg: "75.5" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.weightKg).toBe(75.5);
  });

  it("accepts calories only", () => {
    const r = dailyLogFormSchema.safeParse({ logDate: "2026-06-12", calorieIntake: "2100" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.calorieIntake).toBe(2100);
  });

  it("accepts both weight and calories", () => {
    const r = dailyLogFormSchema.safeParse({ logDate: "2026-06-12", weightKg: "80", calorieIntake: "1800" });
    expect(r.success).toBe(true);
  });

  it("treats empty string weightKg as undefined", () => {
    const r = dailyLogFormSchema.safeParse({ logDate: "2026-06-12", weightKg: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.weightKg).toBeUndefined();
  });

  it("rejects an invalid logDate format", () => {
    expect(dailyLogFormSchema.safeParse({ logDate: "12/06/2026", weightKg: "70" }).success).toBe(false);
    expect(dailyLogFormSchema.safeParse({ logDate: "", weightKg: "70" }).success).toBe(false);
  });

  it("rejects negative weight", () => {
    expect(dailyLogFormSchema.safeParse({ logDate: "2026-06-12", weightKg: "-1" }).success).toBe(false);
  });

  it("rejects weight above 500", () => {
    expect(dailyLogFormSchema.safeParse({ logDate: "2026-06-12", weightKg: "501" }).success).toBe(false);
  });

  it("rejects calories above 20000", () => {
    expect(dailyLogFormSchema.safeParse({ logDate: "2026-06-12", calorieIntake: "20001" }).success).toBe(false);
  });

  it("accepts a note field", () => {
    const r = dailyLogFormSchema.safeParse({ logDate: "2026-06-12", weightKg: "70", note: "felt good" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.note).toBe("felt good");
  });

  it("rejects a note longer than 1000 characters", () => {
    const r = dailyLogFormSchema.safeParse({ logDate: "2026-06-12", weightKg: "70", note: "x".repeat(1001) });
    expect(r.success).toBe(false);
  });
});
