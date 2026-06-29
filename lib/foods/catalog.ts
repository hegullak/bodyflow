import { and, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { foodProducts, type FoodProduct, type FoodSource } from "@/db/schema";
import type { KassalProductSummary } from "@/lib/kassal/types";
import {
  findKassalProductByEan,
  findKassalProductById,
  KassalNotConfiguredError,
  searchKassalProducts,
} from "@/lib/kassal/client";
import { isKassalConfigured } from "@/lib/kassal/config";
import {
  buildCustomExternalId,
  formatCustomDisplayName,
  getFoodCustomPrefixId,
} from "./prefix";
import { fetchFromOpenFoodFacts } from "./openfoodfacts";
import type { FoodProductSummary, ResolveFoodInput } from "./types";

export type CustomFoodInput = {
  name: string;
  brand?: string | null;
  ean?: string | null;
  kcalPer100g: number;
  packageGrams?: number | null;
};

function buildSearchText(parts: Array<string | null | undefined>): string {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function rowToSummary(row: FoodProduct): FoodProductSummary {
  return {
    id: row.id,
    source: row.source,
    externalId: row.externalId,
    name: row.name,
    prettyName: row.prettyName ?? null,
    brand: row.brand,
    ean: row.ean,
    image: row.imageUrl,
    kcalPer100g: row.kcalPer100g,
    packageGrams: row.packageGrams,
  };
}

function kassalToSummary(product: KassalProductSummary, cached: FoodProduct | null): FoodProductSummary {
  return {
    id: cached?.id ?? null,
    source: "kassal",
    externalId: String(product.id),
    name: product.name,
    prettyName: cached?.prettyName ?? null,
    brand: product.brand,
    ean: product.ean,
    image: product.image,
    kcalPer100g: product.kcalPer100g,
    packageGrams: product.packageGrams,
  };
}

export async function findLocalFoodById(id: string): Promise<FoodProduct | null> {
  const db = getDb();
  return (
    (await db.query.foodProducts.findFirst({
      where: eq(foodProducts.id, id),
    })) ?? null
  );
}

export async function findLocalFoodByEan(ean: string): Promise<FoodProduct | null> {
  const normalized = ean.replace(/\D/g, "");
  if (!normalized) return null;
  const db = getDb();
  return (
    (await db.query.foodProducts.findFirst({
      where: eq(foodProducts.ean, normalized),
    })) ?? null
  );
}

export async function findLocalFoodBySource(
  source: FoodSource,
  externalId: string,
): Promise<FoodProduct | null> {
  const db = getDb();
  return (
    (await db.query.foodProducts.findFirst({
      where: and(eq(foodProducts.source, source), eq(foodProducts.externalId, externalId)),
    })) ?? null
  );
}

async function searchLocalFoodProducts(query: string, limit = 15): Promise<FoodProductSummary[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const pattern = `%${trimmed}%`;
  const db = getDb();
  const rows = await db
    .select()
    .from(foodProducts)
    .where(
      or(
        ilike(foodProducts.name, pattern),
        ilike(foodProducts.searchText, pattern),
        ilike(foodProducts.brand, pattern),
      ),
    )
    .orderBy(
      sql`case when ${foodProducts.source} = 'matvaretabellen' then 0 else 1 end`,
      foodProducts.name,
    )
    .limit(limit);

  return rows.map(rowToSummary);
}

export async function upsertCustomFoodProduct(input: CustomFoodInput): Promise<FoodProduct> {
  const db = getDb();
  const ean = input.ean?.replace(/\D/g, "") || null;

  if (ean) {
    const existing = await findLocalFoodByEan(ean);
    if (existing?.source === "custom") return existing;
  }

  const displayName = formatCustomDisplayName(input.name.trim());
  const externalId = buildCustomExternalId();
  const values = {
    source: "custom" as const,
    externalId,
    ean,
    name: displayName,
    brand: input.brand?.trim() || null,
    imageUrl: null,
    kcalPer100g: input.kcalPer100g,
    packageGrams: input.packageGrams ?? null,
    searchText: buildSearchText([displayName, input.brand, ean, getFoodCustomPrefixId()]),
    fetchedAt: new Date(),
    updatedAt: new Date(),
  };

  const [row] = await db.insert(foodProducts).values(values).returning();
  return row;
}

export async function upsertFoodFromKassal(product: KassalProductSummary): Promise<FoodProduct> {
  if (product.kcalPer100g == null) {
    throw new Error("Product is missing calorie data.");
  }

  const db = getDb();
  const externalId = String(product.id);
  const ean = product.ean?.replace(/\D/g, "") || null;
  const values = {
    source: "kassal" as const,
    externalId,
    ean,
    name: product.name,
    brand: product.brand,
    imageUrl: product.image,
    kcalPer100g: product.kcalPer100g,
    packageGrams: product.packageGrams,
    searchText: buildSearchText([product.name, product.brand, ean]),
    fetchedAt: new Date(),
    updatedAt: new Date(),
  };

  const [row] = await db
    .insert(foodProducts)
    .values(values)
    .onConflictDoUpdate({
      target: [foodProducts.source, foodProducts.externalId],
      set: {
        ean: values.ean,
        name: values.name,
        brand: values.brand,
        imageUrl: values.imageUrl,
        kcalPer100g: values.kcalPer100g,
        packageGrams: values.packageGrams,
        searchText: values.searchText,
        fetchedAt: values.fetchedAt,
        updatedAt: values.updatedAt,
      },
    })
    .returning();

  return row;
}

export async function upsertFoodFromOpenFoodFacts(ean: string, product: Awaited<ReturnType<typeof fetchFromOpenFoodFacts>>): Promise<FoodProduct> {
  if (!product?.kcalPer100g) {
    throw new Error("Product is missing calorie data.");
  }

  const db = getDb();
  const values = {
    source: "openfoodfacts" as const,
    externalId: ean,
    ean,
    name: product.name,
    brand: product.brand ?? null,
    imageUrl: product.image ?? null,
    kcalPer100g: product.kcalPer100g,
    packageGrams: product.packageGrams ?? null,
    searchText: buildSearchText([product.name, product.brand, ean]),
    fetchedAt: new Date(),
    updatedAt: new Date(),
  };

  const [row] = await db
    .insert(foodProducts)
    .values(values)
    .onConflictDoUpdate({
      target: [foodProducts.source, foodProducts.externalId],
      set: {
        ean: values.ean,
        name: values.name,
        brand: values.brand,
        imageUrl: values.imageUrl,
        kcalPer100g: values.kcalPer100g,
        packageGrams: values.packageGrams,
        searchText: values.searchText,
        fetchedAt: values.fetchedAt,
        updatedAt: values.updatedAt,
      },
    })
    .returning();

  return row;
}

export async function searchFoodProducts(query: string): Promise<FoodProductSummary[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const local = await searchLocalFoodProducts(trimmed, 15);
  const seen = new Set(local.map((item) => `${item.source}:${item.externalId}`));
  const merged: FoodProductSummary[] = [...local];

  if (isKassalConfigured() && trimmed.length >= 3) {
    try {
      const remote = await searchKassalProducts(trimmed, 15);
      for (const product of remote) {
        const key = `kassal:${product.id}`;
        if (seen.has(key)) continue;

        const cached = await findLocalFoodBySource("kassal", String(product.id));
        merged.push(kassalToSummary(product, cached));
        seen.add(key);
      }
    } catch (error) {
      if (!(error instanceof KassalNotConfiguredError)) {
        throw error;
      }
    }
  }

  const sourceOrder = { matvaretabellen: 0, kassal: 1, custom: 2 } as const;
  const q = trimmed.toLowerCase();
  merged.sort((a, b) => {
    const sa = sourceOrder[a.source] ?? 9;
    const sb = sourceOrder[b.source] ?? 9;
    if (sa !== sb) return sa - sb;
    const aPrefix = (a.prettyName ?? a.name).toLowerCase().startsWith(q) ? 0 : 1;
    const bPrefix = (b.prettyName ?? b.name).toLowerCase().startsWith(q) ? 0 : 1;
    return aPrefix - bPrefix;
  });

  return merged.slice(0, 25);
}

export async function lookupFoodByEan(ean: string): Promise<FoodProductSummary | null> {
  const result = await lookupFoodByEanWithSources(ean);
  return result.product;
}

export async function lookupFoodByEanWithSources(
  ean: string,
): Promise<{ product: FoodProductSummary | null; sourcesTried: string[] }> {
  const normalized = ean.replace(/\D/g, "");
  if (!normalized) return { product: null, sourcesTried: [] };

  const sourcesTried: string[] = [];

  // Check local database first
  sourcesTried.push("Lokalt lager");
  const cached = await findLocalFoodByEan(normalized);
  if (cached) return { product: rowToSummary(cached), sourcesTried };

  // Try Kassal if configured
  if (isKassalConfigured()) {
    sourcesTried.push("Kassal");
    try {
      const remote = await findKassalProductByEan(normalized);
      if (remote?.kcalPer100g) {
        const saved = await upsertFoodFromKassal(remote);
        return { product: rowToSummary(saved), sourcesTried };
      }
    } catch (error) {
      // Continue to Open Food Facts if Kassal fails
    }
  }

  // Fall back to Open Food Facts
  sourcesTried.push("Open Food Facts");
  const offProduct = await fetchFromOpenFoodFacts(normalized);
  if (offProduct) {
    const saved = await upsertFoodFromOpenFoodFacts(normalized, offProduct);
    return { product: rowToSummary(saved), sourcesTried };
  }

  return { product: null, sourcesTried };
}

export async function resolveFoodProduct(input: ResolveFoodInput): Promise<FoodProduct> {
  if (input.foodProductId) {
    const byId = await findLocalFoodById(input.foodProductId);
    if (byId) return byId;
  }

  if (input.ean) {
    const cached = await findLocalFoodByEan(input.ean);
    if (cached) return cached;

    if (isKassalConfigured()) {
      try {
        const remote = await findKassalProductByEan(input.ean);
        if (remote) return upsertFoodFromKassal(remote);
      } catch (error) {
        // Continue to Open Food Facts if Kassal fails
      }
    }

    const offProduct = await fetchFromOpenFoodFacts(input.ean);
    if (offProduct) {
      return upsertFoodFromOpenFoodFacts(input.ean, offProduct);
    }

    throw new Error("Product not found.");
  }

  if (input.source && input.externalId) {
    const cached = await findLocalFoodBySource(input.source, input.externalId);
    if (cached) return cached;

    if (input.source === "kassal") {
      if (!isKassalConfigured()) {
        throw new Error("Product not found locally and Kassal is not configured.");
      }
      const remote = await findKassalProductById(input.externalId);
      if (remote) return upsertFoodFromKassal(remote);
      throw new Error("Product not found.");
    }

    if (input.source === "matvaretabellen") {
      throw new Error("Product not found. Run npm run db:seed-matvaretabellen.");
    }

    if (input.source === "custom" || input.source === "openfoodfacts") {
      throw new Error("Product not found.");
    }
  }

  throw new Error("Could not resolve food product.");
}

export function getFoodCatalogConfig() {
  return {
    customPrefixId: getFoodCustomPrefixId(),
    visionEnabled: Boolean(process.env.OPENAI_API_KEY?.trim()),
  };
}
