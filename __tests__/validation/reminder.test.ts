import { describe, expect, it } from "vitest";
import { upsertReminderSchema } from "@/lib/validation/reminder";

const valid = {
  reminderType: "weigh_in",
  enabled: true,
  weekdays: [1, 3, 5],
  reminderTime: "08:00",
  timezone: "Europe/Oslo",
};

describe("upsertReminderSchema", () => {
  it("accepts a fully valid payload", () => {
    expect(upsertReminderSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an unknown reminderType", () => {
    expect(upsertReminderSchema.safeParse({ ...valid, reminderType: "run_5km" }).success).toBe(false);
  });

  it("rejects empty weekdays array", () => {
    expect(upsertReminderSchema.safeParse({ ...valid, weekdays: [] }).success).toBe(false);
  });

  it("rejects weekday values outside 0–6", () => {
    expect(upsertReminderSchema.safeParse({ ...valid, weekdays: [7] }).success).toBe(false);
    expect(upsertReminderSchema.safeParse({ ...valid, weekdays: [-1] }).success).toBe(false);
  });

  it("rejects invalid reminderTime format", () => {
    expect(upsertReminderSchema.safeParse({ ...valid, reminderTime: "8:00" }).success).toBe(false);
    expect(upsertReminderSchema.safeParse({ ...valid, reminderTime: "24:00" }).success).toBe(false);
    expect(upsertReminderSchema.safeParse({ ...valid, reminderTime: "not-a-time" }).success).toBe(false);
  });

  it("accepts valid reminderTime boundary values", () => {
    expect(upsertReminderSchema.safeParse({ ...valid, reminderTime: "00:00" }).success).toBe(true);
    expect(upsertReminderSchema.safeParse({ ...valid, reminderTime: "23:59" }).success).toBe(true);
  });

  it("rejects empty timezone", () => {
    expect(upsertReminderSchema.safeParse({ ...valid, timezone: "" }).success).toBe(false);
  });
});
