"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { mealLogItems, savedMealItems, savedMeals, type MealType } from "@/db/schema";
import { requireUserId } from "@/lib/auth/current-user";
import { scopeBy } from "@/lib/auth/scope";
import { logger } from "@/lib/logger";
import { type ActionResult } from "@/shared/actions/types";

export async function saveMealAction(
  logDate: string,
  mealType: MealType,
  name: string,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Navn kan ikke være tomt." };

  try {
    const db = getDb();
    const items = await db
      .select()
      .from(mealLogItems)
      .where(and(
        eq(mealLogItems.userId, userId),
        eq(mealLogItems.logDate, logDate),
        eq(mealLogItems.mealType, mealType),
        isNull(mealLogItems.deletedAt),
      ));

    if (!items.length) return { ok: false, error: "Ingen matvarer å lagre." };

    const totalKcal = items.reduce((s, i) => s + i.caloriesKcal, 0);
    const totalGrams = items.reduce((s, i) => s + i.quantityGrams, 0);

    const [meal] = await db
      .insert(savedMeals)
      .values({ userId, name: trimmed, totalKcal, totalGrams, updatedAt: new Date() })
      .returning({ id: savedMeals.id });

    await db.insert(savedMealItems).values(
      items.map((item) => ({
        savedMealId: meal.id,
        foodProductId: item.foodProductId,
        productName: item.productName,
        brand: item.brand,
        quantityGrams: item.quantityGrams,
        kcalPer100g: item.kcalPer100g,
        caloriesKcal: item.caloriesKcal,
      })),
    );

    return { ok: true, data: undefined };
  } catch (error) {
    logger.error("SavedMeals", "saveMealAction failed", {
      reason: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "Kunne ikke lagre måltid. Prøv igjen." };
  }
}

export async function getSavedMealsAction(): Promise<
  ActionResult<Array<{ id: string; name: string; totalKcal: number; totalGrams: number }>>
> {
  const userId = await requireUserId();
  try {
    const db = getDb();
    const meals = await db
      .select()
      .from(savedMeals)
      .where(and(eq(savedMeals.userId, userId), isNull(savedMeals.deletedAt)))
      .orderBy(desc(savedMeals.createdAt));
    return {
      ok: true,
      data: meals.map((m) => ({
        id: m.id,
        name: m.name,
        totalKcal: Math.round(m.totalKcal),
        totalGrams: Math.round(m.totalGrams),
      })),
    };
  } catch (error) {
    logger.error("SavedMeals", "getSavedMealsAction failed", {
      reason: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "Kunne ikke hente lagrede måltider." };
  }
}

export async function addSavedMealToLogAction(
  savedMealId: string,
  logDate: string,
  mealType: MealType,
): Promise<ActionResult> {
  const userId = await requireUserId();
  try {
    const db = getDb();

    const [meal] = await db
      .select()
      .from(savedMeals)
      .where(and(eq(savedMeals.id, savedMealId), eq(savedMeals.userId, userId)))
      .limit(1);

    if (!meal) return { ok: false, error: "Måltid ikke funnet." };

    const items = await db
      .select()
      .from(savedMealItems)
      .where(eq(savedMealItems.savedMealId, savedMealId));

    await db.insert(mealLogItems).values(
      items.map((item) => ({
        userId,
        logDate,
        mealType,
        foodProductId: item.foodProductId,
        productName: item.productName,
        brand: item.brand,
        quantityGrams: item.quantityGrams,
        kcalPer100g: item.kcalPer100g,
        caloriesKcal: item.caloriesKcal,
        updatedAt: new Date(),
      })),
    );

    revalidatePath("/meals");
    revalidatePath("/dashboard");
    revalidatePath("/check-in");
    return { ok: true, data: undefined };
  } catch (error) {
    logger.error("SavedMeals", "addSavedMealToLogAction failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: "Kunne ikke legge til måltid." };
  }
}

export async function deleteSavedMealAction(savedMealId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  try {
    const db = getDb();
    await db
      .update(savedMeals)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(scopeBy(savedMeals.userId, userId, eq(savedMeals.id, savedMealId)));
    return { ok: true, data: undefined };
  } catch (error) {
    logger.error("SavedMeals", "deleteSavedMealAction failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: "Kunne ikke slette måltid." };
  }
}
