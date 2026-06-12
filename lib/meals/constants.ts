import type { MealType } from "@/db/schema";

export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "snack", "dinner", "evening"];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Frokost",
  lunch: "Lunsj",
  snack: "Mellommåltid",
  dinner: "Middag",
  evening: "Kvelds",
};
