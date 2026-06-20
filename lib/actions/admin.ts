"use server";

import { eq, ilike, asc, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { exercises, foodProducts } from "@/db/schema";
import { requireUserId } from "@/lib/auth/current-user";

export async function updateExerciseNamesAction(
  id: string,
  name: string,
  nameNo: string | null,
): Promise<{ ok: boolean; error?: string }> {
  await requireUserId();
  try {
    const db = getDb();
    await db.update(exercises).set({ name: name.trim(), nameNo: nameNo?.trim() ?? null, updatedAt: new Date() }).where(eq(exercises.id, id));
    return { ok: true };
  } catch {
    return { ok: false, error: "Kunne ikke lagre." };
  }
}

export async function updateFoodPrettyNameAction(
  id: string,
  prettyName: string | null,
): Promise<{ ok: boolean; error?: string }> {
  await requireUserId();
  try {
    const db = getDb();
    await db.update(foodProducts).set({ prettyName: prettyName?.trim() || null, updatedAt: new Date() }).where(eq(foodProducts.id, id));
    return { ok: true };
  } catch {
    return { ok: false, error: "Kunne ikke lagre." };
  }
}

export async function searchExercisesAdminAction(query: string, offset = 0, limit = 50) {
  await requireUserId();
  const db = getDb();
  const q = query.trim();
  const rows = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      nameNo: exercises.nameNo,
      slug: exercises.slug,
      equipment: exercises.equipment,
      imageUrl: exercises.imageUrl,
    })
    .from(exercises)
    .where(q ? or(ilike(exercises.name, `%${q}%`), ilike(exercises.nameNo, `%${q}%`)) : undefined)
    .orderBy(asc(exercises.name))
    .limit(limit)
    .offset(offset);
  return rows;
}

export async function searchFoodsAdminAction(query: string, source: string, offset = 0, limit = 50) {
  await requireUserId();
  const db = getDb();
  const q = query.trim();
  const rows = await db
    .select({
      id: foodProducts.id,
      name: foodProducts.name,
      prettyName: foodProducts.prettyName,
      brand: foodProducts.brand,
      source: foodProducts.source,
      kcalPer100g: foodProducts.kcalPer100g,
    })
    .from(foodProducts)
    .where(
      q
        ? or(
            ilike(foodProducts.name, `%${q}%`),
            ilike(foodProducts.prettyName, `%${q}%`),
            ilike(foodProducts.brand, `%${q}%`),
          )
        : source !== "all"
          ? eq(foodProducts.source, source as "kassal" | "matvaretabellen" | "custom")
          : undefined,
    )
    .orderBy(asc(foodProducts.name))
    .limit(limit)
    .offset(offset);
  return rows;
}
