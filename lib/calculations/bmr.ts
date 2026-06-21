// BMR (Basal Metabolic Rate) and TDEE (Total Daily Energy Expenditure) calculations
// Using Mifflin-St Jeor equation for BMR (most accurate for modern populations)

export type Sex = "male" | "female" | "other" | "prefer_not_to_say";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:   1.2,   // little or no exercise
  light:       1.375, // light exercise 1-3 days/week
  moderate:    1.55,  // moderate exercise 3-5 days/week
  active:      1.725, // vigorous exercise 6-7 days/week
  very_active: 1.9,   // very vigorous exercise 6-7 days/week
};

/**
 * Calculate BMR using Mifflin-St Jeor equation
 * More accurate than Harris-Benedict for modern populations
 */
export function calcBMR(
  sex: Sex | null | undefined,
  weightKg: number | null | undefined,
  heightCm: number | null | undefined,
  ageYears: number | null | undefined,
): number | null {
  if (!sex || !weightKg || !heightCm || !ageYears) return null;
  if (sex === "other" || sex === "prefer_not_to_say") return null;

  const isMale = sex === "male";

  // Mifflin-St Jeor formula:
  // Men: BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age_years) + 5
  // Women: BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age_years) - 161
  const bmr = isMale
    ? (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears) + 5
    : (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears) - 161;

  return Math.round(bmr);
}

/**
 * Calculate TDEE based on BMR and activity level
 */
export function calcTDEE(
  bmr: number | null | undefined,
  activityLevel: ActivityLevel | null | undefined,
): number | null {
  if (!bmr || !activityLevel) return null;
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  return Math.round(bmr * multiplier);
}

/**
 * Adjusted calorie recommendation based on goal
 */
export type Goal = "fat_loss" | "maintenance" | "muscle_gain";

export function adjustedCaloricIntake(
  tdee: number | null | undefined,
  goal: Goal | null | undefined,
): number | null {
  if (!tdee || !goal) return null;

  switch (goal) {
    case "fat_loss":       return Math.round(tdee * 0.85);  // 15% deficit
    case "maintenance":    return tdee;
    case "muscle_gain":    return Math.round(tdee * 1.1);   // 10% surplus
    default:               return null;
  }
}

/**
 * Current age from birth year
 */
export function ageFromBirthYear(birthYear: number | null | undefined): number | null {
  if (!birthYear) return null;
  return new Date().getFullYear() - birthYear;
}
