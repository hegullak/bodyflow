import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { foodProducts, recipes, recipeIngredients } from "@/db/schema";
import type { Recipe, RecipeIngredient } from "@/db/schema";

export type { Recipe, RecipeIngredient };

export interface RecipeIngredientRow {
  id: string;
  foodProductId: string | null;
  productName: string;
  kcalPer100g: number;
  quantityGrams: number;
  sortOrder: number;
  caloriesKcal: number;
}

export interface RecipeDetail {
  id: string;
  name: string;
  totalWeightG: number;
  cookedWeightG: number | null;
  kcalPer100g: number;
  totalKcal: number;
  foodProductId: string | null;
  ingredients: RecipeIngredientRow[];
}

export interface RecipeSummary {
  id: string;
  name: string;
  kcalPer100g: number;
  totalWeightG: number;
  ingredientCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calcNutrition(
  ingredients: { kcalPer100g: number; quantityGrams: number }[],
  cookedWeightG: number | null,
) {
  const totalKcal = ingredients.reduce((sum, i) => sum + (i.kcalPer100g * i.quantityGrams) / 100, 0);
  const totalWeightG = ingredients.reduce((sum, i) => sum + i.quantityGrams, 0);
  const effectiveWeight = cookedWeightG ?? totalWeightG;
  const kcalPer100g = effectiveWeight > 0 ? (totalKcal / effectiveWeight) * 100 : 0;
  return { totalKcal, totalWeightG, kcalPer100g };
}

async function syncFoodProduct(
  db: ReturnType<typeof getDb>,
  recipeId: string,
  name: string,
  kcalPer100g: number,
  existingFoodProductId: string | null,
): Promise<string> {
  const externalId = `recipe-${recipeId}`;
  if (existingFoodProductId) {
    await db
      .update(foodProducts)
      .set({ name, kcalPer100g, searchText: name.toLowerCase(), updatedAt: new Date() })
      .where(eq(foodProducts.id, existingFoodProductId));
    return existingFoodProductId;
  }
  const [fp] = await db
    .insert(foodProducts)
    .values({
      source: "custom",
      externalId,
      name,
      kcalPer100g,
      searchText: name.toLowerCase(),
      fetchedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [foodProducts.source, foodProducts.externalId],
      set: { name, kcalPer100g, searchText: name.toLowerCase(), updatedAt: new Date() },
    })
    .returning({ id: foodProducts.id });
  return fp.id;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listRecipes(userId: string): Promise<RecipeSummary[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: recipes.id,
      name: recipes.name,
      kcalPer100g: recipes.kcalPer100g,
      totalWeightG: recipes.totalWeightG,
    })
    .from(recipes)
    .where(and(eq(recipes.userId, userId), isNull(recipes.deletedAt)))
    .orderBy(asc(recipes.createdAt));

  // Get ingredient counts separately
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return [];

  const counts = await db
    .select({ recipeId: recipeIngredients.recipeId })
    .from(recipeIngredients)
    .where(and(...ids.map((id) => eq(recipeIngredients.recipeId, id))));

  const countMap = new Map<string, number>();
  for (const c of counts) countMap.set(c.recipeId, (countMap.get(c.recipeId) ?? 0) + 1);

  return rows.map((r) => ({ ...r, ingredientCount: countMap.get(r.id) ?? 0 }));
}

export async function getRecipeDetail(id: string, userId: string): Promise<RecipeDetail | null> {
  const db = getDb();
  const [recipe] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.userId, userId), isNull(recipes.deletedAt)))
    .limit(1);

  if (!recipe) return null;

  const ingredients = await db
    .select()
    .from(recipeIngredients)
    .where(eq(recipeIngredients.recipeId, id))
    .orderBy(asc(recipeIngredients.sortOrder), asc(recipeIngredients.createdAt));

  const totalKcal = ingredients.reduce(
    (sum, i) => sum + (i.kcalPer100g * i.quantityGrams) / 100,
    0,
  );

  return {
    id: recipe.id,
    name: recipe.name,
    totalWeightG: recipe.totalWeightG,
    cookedWeightG: recipe.cookedWeightG,
    kcalPer100g: recipe.kcalPer100g,
    totalKcal,
    foodProductId: recipe.foodProductId,
    ingredients: ingredients.map((i) => ({
      id: i.id,
      foodProductId: i.foodProductId,
      productName: i.productName,
      kcalPer100g: i.kcalPer100g,
      quantityGrams: i.quantityGrams,
      sortOrder: i.sortOrder,
      caloriesKcal: (i.kcalPer100g * i.quantityGrams) / 100,
    })),
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createRecipe(userId: string, name: string): Promise<RecipeDetail> {
  const db = getDb();
  const [recipe] = await db
    .insert(recipes)
    .values({ userId, name, totalWeightG: 0, kcalPer100g: 0 })
    .returning();

  const foodProductId = await syncFoodProduct(db, recipe.id, name, 0, null);
  await db.update(recipes).set({ foodProductId }).where(eq(recipes.id, recipe.id));

  return {
    id: recipe.id,
    name: recipe.name,
    totalWeightG: 0,
    cookedWeightG: null,
    kcalPer100g: 0,
    totalKcal: 0,
    foodProductId,
    ingredients: [],
  };
}

export async function addIngredient(
  recipeId: string,
  userId: string,
  input: { foodProductId?: string | null; productName: string; kcalPer100g: number; quantityGrams: number },
): Promise<RecipeDetail | null> {
  const db = getDb();

  const [recipe] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId), isNull(recipes.deletedAt)))
    .limit(1);
  if (!recipe) return null;

  const existing = await db
    .select({ sortOrder: recipeIngredients.sortOrder })
    .from(recipeIngredients)
    .where(eq(recipeIngredients.recipeId, recipeId))
    .orderBy(asc(recipeIngredients.sortOrder));

  const nextOrder = existing.length > 0 ? (existing[existing.length - 1].sortOrder + 1) : 0;

  await db.insert(recipeIngredients).values({
    recipeId,
    foodProductId: input.foodProductId ?? null,
    productName: input.productName,
    kcalPer100g: input.kcalPer100g,
    quantityGrams: input.quantityGrams,
    sortOrder: nextOrder,
  });

  return recalcAndSave(recipeId, userId, db, recipe.name, recipe.cookedWeightG, recipe.foodProductId);
}

export async function removeIngredient(
  ingredientId: string,
  recipeId: string,
  userId: string,
): Promise<RecipeDetail | null> {
  const db = getDb();

  const [recipe] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId), isNull(recipes.deletedAt)))
    .limit(1);
  if (!recipe) return null;

  await db
    .delete(recipeIngredients)
    .where(and(eq(recipeIngredients.id, ingredientId), eq(recipeIngredients.recipeId, recipeId)));

  return recalcAndSave(recipeId, userId, db, recipe.name, recipe.cookedWeightG, recipe.foodProductId);
}

export async function updateIngredientQty(
  ingredientId: string,
  recipeId: string,
  userId: string,
  quantityGrams: number,
): Promise<RecipeDetail | null> {
  const db = getDb();

  const [recipe] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId), isNull(recipes.deletedAt)))
    .limit(1);
  if (!recipe) return null;

  await db
    .update(recipeIngredients)
    .set({ quantityGrams })
    .where(and(eq(recipeIngredients.id, ingredientId), eq(recipeIngredients.recipeId, recipeId)));

  return recalcAndSave(recipeId, userId, db, recipe.name, recipe.cookedWeightG, recipe.foodProductId);
}

export async function updateRecipe(
  recipeId: string,
  userId: string,
  patch: { name?: string; cookedWeightG?: number | null },
): Promise<RecipeDetail | null> {
  const db = getDb();

  const [recipe] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId), isNull(recipes.deletedAt)))
    .limit(1);
  if (!recipe) return null;

  if (patch.name !== undefined) {
    await db.update(recipes).set({ name: patch.name, updatedAt: new Date() }).where(eq(recipes.id, recipeId));
  }
  if ("cookedWeightG" in patch) {
    await db.update(recipes).set({ cookedWeightG: patch.cookedWeightG ?? null, updatedAt: new Date() }).where(eq(recipes.id, recipeId));
  }

  const newName = patch.name ?? recipe.name;
  const newCookedWeight = "cookedWeightG" in patch ? (patch.cookedWeightG ?? null) : recipe.cookedWeightG;
  return recalcAndSave(recipeId, userId, db, newName, newCookedWeight, recipe.foodProductId);
}

export async function deleteRecipe(recipeId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const [recipe] = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
    .limit(1);
  if (!recipe) return false;

  await db.update(recipes).set({ deletedAt: new Date() }).where(eq(recipes.id, recipeId));
  return true;
}

// ---------------------------------------------------------------------------
// Internal: recalculate nutrition + sync food_product
// ---------------------------------------------------------------------------

async function recalcAndSave(
  recipeId: string,
  userId: string,
  db: ReturnType<typeof getDb>,
  name: string,
  cookedWeightG: number | null,
  existingFoodProductId: string | null,
): Promise<RecipeDetail | null> {
  const ingredients = await db
    .select()
    .from(recipeIngredients)
    .where(eq(recipeIngredients.recipeId, recipeId))
    .orderBy(asc(recipeIngredients.sortOrder), asc(recipeIngredients.createdAt));

  const { totalKcal, totalWeightG, kcalPer100g } = calcNutrition(ingredients, cookedWeightG);

  const foodProductId = await syncFoodProduct(db, recipeId, name, kcalPer100g, existingFoodProductId);

  await db
    .update(recipes)
    .set({ totalWeightG, kcalPer100g, foodProductId, updatedAt: new Date() })
    .where(eq(recipes.id, recipeId));

  return {
    id: recipeId,
    name,
    totalWeightG,
    cookedWeightG,
    kcalPer100g,
    totalKcal,
    foodProductId,
    ingredients: ingredients.map((i) => ({
      id: i.id,
      foodProductId: i.foodProductId,
      productName: i.productName,
      kcalPer100g: i.kcalPer100g,
      quantityGrams: i.quantityGrams,
      sortOrder: i.sortOrder,
      caloriesKcal: (i.kcalPer100g * i.quantityGrams) / 100,
    })),
  };
}
