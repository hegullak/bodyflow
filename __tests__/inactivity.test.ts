import { describe, it, expect } from "vitest";
import { getComebackMessage, daysSinceActivity } from "@/lib/inactivity";

describe("inactivity helper", () => {
  it("returns null when no activity date is provided", () => {
    expect(getComebackMessage(null)).toBeNull();
    expect(getComebackMessage(undefined)).toBeNull();
  });

  it("returns null when activity is recent (< 14 days)", () => {
    const today = new Date();
    const fiveDaysAgo = new Date(today);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const isoDate = fiveDaysAgo.toISOString().split("T")[0]!;

    expect(getComebackMessage(isoDate)).toBeNull();
  });

  it("returns comeback message when inactive for 14+ days", () => {
    const today = new Date();
    const fifteenDaysAgo = new Date(today);
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    const isoDate = fifteenDaysAgo.toISOString().split("T")[0]!;

    const message = getComebackMessage(isoDate);
    expect(message).not.toBeNull();
    expect(message?.title).toBe("Skal vi starte igjen nå?");
    expect(message?.slogan).toBe("A little beats nothing. Every time.");
  });

  it("returns null for daysSinceActivity when no date provided", () => {
    expect(daysSinceActivity(null)).toBeNull();
    expect(daysSinceActivity(undefined)).toBeNull();
  });

  it("calculates days since activity correctly", () => {
    const today = new Date();
    const fiveDaysAgo = new Date(today);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const isoDate = fiveDaysAgo.toISOString().split("T")[0]!;

    const days = daysSinceActivity(isoDate);
    expect(days).toBe(5);
  });

  it("returns comeback message exactly at threshold (14 days)", () => {
    const today = new Date();
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const isoDate = fourteenDaysAgo.toISOString().split("T")[0]!;

    const message = getComebackMessage(isoDate);
    expect(message).not.toBeNull();
    expect(message?.slogan).toContain("A little beats nothing");
  });

  it("does not return comeback message just before threshold (13 days)", () => {
    const today = new Date();
    const thirteenDaysAgo = new Date(today);
    thirteenDaysAgo.setDate(thirteenDaysAgo.getDate() - 13);
    const isoDate = thirteenDaysAgo.toISOString().split("T")[0]!;

    expect(getComebackMessage(isoDate)).toBeNull();
  });
});
