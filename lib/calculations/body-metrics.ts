import type { ActivityLevel, Sex } from "@/db/schema";

export type BmiCategory =
  | "underweight"
  | "normal"
  | "overweight"
  | "obese";

export interface WeightRangeKg {
  minKg: number;
  maxKg: number;
}

export interface DailyValue {
  date: string;
  value: number;
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calculateBmi(weightKg: number, heightCm: number): number | null {
  if (weightKg <= 0 || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return round(weightKg / (heightM * heightM), 1);
}

export function getBmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}

export function formatBmiCategory(category: BmiCategory): string {
  switch (category) {
    case "underweight":
      return "Underweight";
    case "normal":
      return "Normal range";
    case "overweight":
      return "Overweight";
    case "obese":
      return "Obese";
  }
}

export function getNormalWeightRangeKg(heightCm: number): WeightRangeKg | null {
  if (heightCm <= 0) return null;
  const heightM = heightCm / 100;
  const minKg = round(18.5 * heightM * heightM, 1);
  const maxKg = round(24.9 * heightM * heightM, 1);
  return { minKg, maxKg };
}

export function calculateAgeYears(
  referenceDate: Date,
  birthYear?: number | null,
  birthDate?: string | null,
): number | null {
  if (birthDate) {
    const born = new Date(`${birthDate}T12:00:00`);
    if (Number.isNaN(born.getTime())) return null;
    let age = referenceDate.getFullYear() - born.getFullYear();
    const monthDiff = referenceDate.getMonth() - born.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < born.getDate())) {
      age -= 1;
    }
    return age >= 0 ? age : null;
  }
  if (birthYear && birthYear > 0) {
    const age = referenceDate.getFullYear() - birthYear;
    return age >= 0 ? age : null;
  }
  return null;
}

export function calculateBmrMifflinStJeor(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: Sex | null | undefined,
): number | null {
  if (weightKg <= 0 || heightCm <= 0 || ageYears < 0) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  if (sex === "male") return Math.round(base + 5);
  if (sex === "female") return Math.round(base - 161);
  // Neutral estimate for other / prefer not to say
  return Math.round(base - 78);
}

export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number | null {
  if (bmr <= 0) return null;
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

export function calculateCalorieBalance(
  calorieIntake: number | null | undefined,
  tdee: number | null,
): number | null {
  if (calorieIntake == null || tdee == null) return null;
  return calorieIntake - tdee;
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length, 1);
}

export function rollingAverage7Day(entries: DailyValue[], referenceDate: Date): number | null {
  const end = startOfDay(referenceDate);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const values = entries
    .filter((entry) => {
      const date = startOfDay(new Date(`${entry.date}T12:00:00`));
      return date >= start && date <= end;
    })
    .map((entry) => entry.value);
  return average(values);
}

export function weeklyAverage(
  entries: DailyValue[],
  weekStart: Date,
): number | null {
  const start = startOfDay(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const values = entries
    .filter((entry) => {
      const date = startOfDay(new Date(`${entry.date}T12:00:00`));
      return date >= start && date <= end;
    })
    .map((entry) => entry.value);
  return average(values);
}

export function startOfWeekMonday(reference: Date): Date {
  const date = startOfDay(reference);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
