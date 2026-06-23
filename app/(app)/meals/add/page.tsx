import { notFound } from "next/navigation";
import { MealAddView } from "@/features/nutrition/components/meal-add-view";
import { MEAL_TYPES } from "@/lib/meals/constants";
import type { MealType } from "@/db/schema";
import { todayIsoDate } from "@/lib/utils";

export default async function MealAddPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; type?: string }>;
}) {
  const { date, type } = await searchParams;
  const logDate = date?.match(/^\d{4}-\d{2}-\d{2}$/) ? date : todayIsoDate();
  if (!type || !MEAL_TYPES.includes(type as MealType)) notFound();

  return <MealAddView logDate={logDate} mealType={type as MealType} />;
}
