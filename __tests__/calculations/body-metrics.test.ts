import { describe, expect, it } from "vitest";
import {
  average,
  calculateAgeYears,
  calculateBmi,
  calculateBmrMifflinStJeor,
  calculateCalorieBalance,
  calculateTdee,
  getBmiCategory,
  getNormalWeightRangeKg,
  rollingAverage7Day,
  startOfWeekMonday,
  weeklyAverage,
} from "@/lib/calculations/body-metrics";

const referenceDate = new Date("2026-06-12T08:00:00Z");

describe("calculateBmi", () => {
  it("returns BMI for valid weight and height", () => {
    expect(calculateBmi(80, 180)).toBe(24.7);
  });

  it("returns null for invalid inputs", () => {
    expect(calculateBmi(0, 180)).toBeNull();
    expect(calculateBmi(80, 0)).toBeNull();
  });
});

describe("getBmiCategory", () => {
  it("classifies BMI ranges", () => {
    expect(getBmiCategory(17)).toBe("underweight");
    expect(getBmiCategory(22)).toBe("normal");
    expect(getBmiCategory(27)).toBe("overweight");
    expect(getBmiCategory(32)).toBe("obese");
  });
});

describe("getNormalWeightRangeKg", () => {
  it("returns healthy weight range for height", () => {
    const range = getNormalWeightRangeKg(180);
    expect(range).toEqual({ minKg: 59.9, maxKg: 80.7 });
  });
});

describe("calculateAgeYears", () => {
  it("derives age from birth year", () => {
    expect(calculateAgeYears(referenceDate, 1990, null)).toBe(36);
  });

  it("derives age from birth date", () => {
    expect(calculateAgeYears(referenceDate, null, "1990-08-20")).toBe(35);
  });
});

describe("calculateBmrMifflinStJeor", () => {
  it("uses male formula", () => {
    expect(calculateBmrMifflinStJeor(80, 180, 35, "male")).toBe(1755);
  });

  it("uses female formula", () => {
    expect(calculateBmrMifflinStJeor(65, 165, 35, "female")).toBe(1345);
  });
});

describe("calculateTdee", () => {
  it("applies activity multiplier", () => {
    expect(calculateTdee(1500, "moderate")).toBe(2325);
  });
});

describe("calculateCalorieBalance", () => {
  it("returns intake minus TDEE", () => {
    expect(calculateCalorieBalance(2000, 2300)).toBe(-300);
    expect(calculateCalorieBalance(2500, 2300)).toBe(200);
  });

  it("returns null when data is missing", () => {
    expect(calculateCalorieBalance(null, 2300)).toBeNull();
    expect(calculateCalorieBalance(2000, null)).toBeNull();
  });
});

describe("averages", () => {
  const entries = [
    { date: "2026-06-06", value: 80 },
    { date: "2026-06-07", value: 79.5 },
    { date: "2026-06-08", value: 79 },
    { date: "2026-06-09", value: 78.8 },
    { date: "2026-06-10", value: 78.5 },
    { date: "2026-06-11", value: 78.2 },
    { date: "2026-06-12", value: 78 },
  ];

  it("calculates simple average", () => {
    expect(average([80, 79, 78])).toBe(79);
  });

  it("calculates rolling 7-day average", () => {
    expect(rollingAverage7Day(entries, referenceDate)).toBe(78.9);
  });

  it("calculates weekly average from Monday start", () => {
    const weekStart = startOfWeekMonday(referenceDate);
    expect(weeklyAverage(entries, weekStart)).toBe(78.5);
  });
});

describe("startOfWeekMonday", () => {
  it("returns Monday for a Friday", () => {
    const monday = startOfWeekMonday(referenceDate);
    expect(localIsoDate(monday)).toBe("2026-06-08");
  });
});

function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
