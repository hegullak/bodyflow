import { describe, it, expect } from "vitest";
import { formatDate, todayIsoDate, addDaysToIsoDate, formatWeekdayDate } from "../utils";

describe("formatDate", () => {
  it("formats ISO date to Norwegian DD.MM.YYYY", () => {
    expect(formatDate("2026-06-15")).toBe("15.06.2026");
  });
  it("pads single-digit month and day", () => {
    expect(formatDate("2026-01-05")).toBe("05.01.2026");
  });
  it("returns input unchanged when there are no dashes to split on", () => {
    expect(formatDate("notadate")).toBe("notadate");
  });
});

describe("todayIsoDate", () => {
  it("returns the reference date as ISO string", () => {
    expect(todayIsoDate(new Date("2026-06-15T12:00:00Z"))).toBe("2026-06-15");
  });
  it("returns a valid ISO date string when called without argument", () => {
    expect(todayIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("addDaysToIsoDate", () => {
  it("adds one day", () => {
    expect(addDaysToIsoDate("2026-06-15", 1)).toBe("2026-06-16");
  });
  it("subtracts one day", () => {
    expect(addDaysToIsoDate("2026-06-15", -1)).toBe("2026-06-14");
  });
  it("subtracts two days", () => {
    expect(addDaysToIsoDate("2026-06-15", -2)).toBe("2026-06-13");
  });
  it("handles zero offset", () => {
    expect(addDaysToIsoDate("2026-06-15", 0)).toBe("2026-06-15");
  });
  it("crosses month boundary forward", () => {
    expect(addDaysToIsoDate("2026-06-30", 1)).toBe("2026-07-01");
  });
  it("crosses month boundary backward", () => {
    expect(addDaysToIsoDate("2026-07-01", -1)).toBe("2026-06-30");
  });
  it("crosses year boundary forward", () => {
    expect(addDaysToIsoDate("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("crosses year boundary backward", () => {
    expect(addDaysToIsoDate("2027-01-01", -1)).toBe("2026-12-31");
  });
  it("handles leap day", () => {
    expect(addDaysToIsoDate("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysToIsoDate("2028-02-29", 1)).toBe("2028-03-01");
  });
});

describe("formatWeekdayDate", () => {
  it("returns a non-empty string", () => {
    expect(formatWeekdayDate("2026-06-15").length).toBeGreaterThan(0);
  });
  it("includes the formatted date", () => {
    expect(formatWeekdayDate("2026-06-15")).toContain("15.06.2026");
  });
  it("starts with an uppercase letter", () => {
    const result = formatWeekdayDate("2026-06-15");
    expect(result[0]).toBe(result[0].toUpperCase());
  });
});
