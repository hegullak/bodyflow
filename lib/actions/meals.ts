"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { dailyBodyLogs, mealLogItems, type MealType } from "@/db/schema";
import { requireUserId } from "@/lib/auth/current-user";
import { scopeBy } from "@/lib/auth/scope";
import { buildMealCalories } from "@/lib/kassal/client";
import { resolveFoodProduct } from "@/lib/foods/catalog";
import { addMealItemSchema } from "@/lib/validation/meal-item";
import { type ActionResult, flattenZodErrors } from "./types";

async function syncDailyCaloriesFromMeals(userId: string, logDate: string) {
  const db = getDb();
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${mealLogItems.caloriesKcal}), 0)`,
    })
    .from(mealLogItems)
    .where(and(eq(mealLogItems.userId, userId), eq(mealLogItems.logDate, logDate)));

  const total = Math.round(Number(row?.total ?? 0));

  await db
    .insert(dailyBodyLogs)
    .values({
      userId,
      logDate,
      calorieIntake: total > 0 ? total : null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [dailyBodyLogs.userId, dailyBodyLogs.logDate],
      set: {
        calorieIntake: total > 0 ? total : null,
        updatedAt: new Date(),
      },
    });
}

export async function addMealItemAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = addMealItemSchema.safeParse({
    logDate: formData.get("logDate"),
    mealType: formData.get("mealType"),
    foodProductId: formData.get("foodProductId") ?? "",
    source: formData.get("source") ?? "",
    externalId: formData.get("externalId") ?? "",
    ean: formData.get("ean") ?? "",
    quantityGrams: formData.get("quantityGrams"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the highlighted fields.",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }

  try {
    const food = await resolveFoodProduct({
      foodProductId: parsed.data.foodProductId,
      source: parsed.data.source,
      externalId: parsed.data.externalId,
      ean: parsed.data.ean,
    });

    const caloriesKcal = buildMealCalories(food.kcalPer100g, parsed.data.quantityGrams);
    const db = getDb();

    await db.insert(mealLogItems).values({
      userId,
      logDate: parsed.data.logDate,
      mealType: parsed.data.mealType,
      foodProductId: food.id,
      kassalProductId: food.source === "kassal" ? Number(food.externalId) : null,
      ean: food.ean,
      productName: food.name,
      brand: food.brand,
      quantityGrams: parsed.data.quantityGrams,
      kcalPer100g: food.kcalPer100g,
      caloriesKcal,
      updatedAt: new Date(),
    });

    await syncDailyCaloriesFromMeals(userId, parsed.data.logDate);

    revalidatePath("/meals");
    revalidatePath("/dashboard");
    revalidatePath("/check-in");
    return { ok: true, data: undefined };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not add meal item.",
    };
  }
}

export async function removeMealItemAction(itemId: string, logDate: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const db = getDb();

  const deleted = await db
    .delete(mealLogItems)
    .where(
      scopeBy(
        mealLogItems.userId,
        userId,
        eq(mealLogItems.id, itemId),
        eq(mealLogItems.logDate, logDate),
      ),
    )
    .returning({ id: mealLogItems.id });

  if (!deleted.length) {
    return { ok: false, error: "Item not found." };
  }

  await syncDailyCaloriesFromMeals(userId, logDate);

  revalidatePath("/meals");
  revalidatePath("/dashboard");
  revalidatePath("/check-in");
  return { ok: true, data: undefined };
}

export async function getMealItemsForDate(userId: string, logDate: string) {
  const db = getDb();
  return db.query.mealLogItems.findMany({
    where: and(eq(mealLogItems.userId, userId), eq(mealLogItems.logDate, logDate)),
    orderBy: (items, { asc }) => [asc(items.mealType), asc(items.createdAt)],
  });
}

export type MealsByType = Record<MealType, Awaited<ReturnType<typeof getMealItemsForDate>>>;

export async function getMealsGroupedByType(
  userId: string,
  logDate: string,
): Promise<{ items: Awaited<ReturnType<typeof getMealItemsForDate>>; byMeal: MealsByType; totalKcal: number }> {
  const items = await getMealItemsForDate(userId, logDate);
  const byMeal = {
    breakfast: items.filter((i) => i.mealType === "breakfast"),
    lunch: items.filter((i) => i.mealType === "lunch"),
    snack: items.filter((i) => i.mealType === "snack"),
    dinner: items.filter((i) => i.mealType === "dinner"),
    evening: items.filter((i) => i.mealType === "evening"),
  };
  const totalKcal = Math.round(items.reduce((sum, item) => sum + item.caloriesKcal, 0));
  return { items, byMeal, totalKcal };
}
