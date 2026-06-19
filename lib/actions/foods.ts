"use server";

import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { foodFavorites, foodProducts } from "@/db/schema";
import { requireUserId } from "@/lib/auth/current-user";
import type { FoodProductSummary } from "@/lib/foods/types";

export async function setPrettyNameAction(
  foodProductId: string,
  prettyName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireUserId();
    const db = getDb();
    const value = prettyName.trim() || null;
    await db
      .update(foodProducts)
      .set({ prettyName: value, updatedAt: new Date() })
      .where(eq(foodProducts.id, foodProductId));
    return { ok: true };
  } catch {
    return { ok: false, error: "Kunne ikke lagre navn." };
  }
}

export async function getFavoriteIdsAction(): Promise<string[]> {
  const userId = await requireUserId();
  const db = getDb();
  const rows = await db
    .select({ foodProductId: foodFavorites.foodProductId })
    .from(foodFavorites)
    .where(eq(foodFavorites.userId, userId));
  return rows.map((r) => r.foodProductId);
}

export async function getFavoriteProductsAction(): Promise<FoodProductSummary[]> {
  const userId = await requireUserId();
  const db = getDb();
  const rows = await db
    .select({ fp: foodProducts })
    .from(foodFavorites)
    .innerJoin(foodProducts, eq(foodFavorites.foodProductId, foodProducts.id))
    .where(eq(foodFavorites.userId, userId))
    .orderBy(asc(foodFavorites.createdAt));
  return rows.map(({ fp }) => ({
    id: fp.id,
    source: fp.source,
    externalId: fp.externalId,
    name: fp.name,
    prettyName: fp.prettyName ?? null,
    brand: fp.brand,
    ean: fp.ean,
    image: fp.imageUrl,
    kcalPer100g: fp.kcalPer100g,
    packageGrams: fp.packageGrams,
  }));
}

export async function toggleFavoriteAction(
  foodProductId: string,
): Promise<{ ok: true; isFavorited: boolean } | { ok: false; error: string }> {
  try {
    const userId = await requireUserId();
    const db = getDb();
    const existing = await db.query.foodFavorites.findFirst({
      where: and(
        eq(foodFavorites.userId, userId),
        eq(foodFavorites.foodProductId, foodProductId),
      ),
    });
    if (existing) {
      await db.delete(foodFavorites).where(eq(foodFavorites.id, existing.id));
      return { ok: true, isFavorited: false };
    }
    await db.insert(foodFavorites).values({ userId, foodProductId });
    return { ok: true, isFavorited: true };
  } catch {
    return { ok: false, error: "Kunne ikke oppdatere favoritt." };
  }
}
