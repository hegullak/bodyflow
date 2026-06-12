import { describe, expect, it } from "vitest";
import {
  getUpcomingReminderTimes,
  makeDateInTimeZone,
  parseReminderTime,
} from "@/lib/reminders/schedule";

describe("parseReminderTime", () => {
  it("parses HH:MM", () => {
    expect(parseReminderTime("07:30")).toEqual({ hour: 7, minute: 30 });
    expect(parseReminderTime("23:05")).toEqual({ hour: 23, minute: 5 });
  });

  it("rejects invalid values", () => {
    expect(parseReminderTime("25:00")).toBeNull();
    expect(parseReminderTime("7:3")).toBeNull();
  });
});

describe("getUpcomingReminderTimes", () => {
  it("returns future times on selected weekdays", () => {
    const from = makeDateInTimeZone(2026, 6, 9, 8, 0, "Europe/Oslo");
    const upcoming = getUpcomingReminderTimes(
      {
        weekdays: [1],
        reminderTime: "07:30",
        timezone: "Europe/Oslo",
      },
      from,
      2,
    );

    expect(upcoming.length).toBeGreaterThan(0);
    expect(upcoming[0].getTime()).toBeGreaterThan(from.getTime());
  });
});
