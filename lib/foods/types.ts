import type { FoodSource } from "@/db/schema";

export type FoodProductSummary = {
  id: string | null;
  source: FoodSource;
  externalId: string;
  name: string;
  prettyName: string | null;
  brand: string | null;
  ean: string | null;
  image: string | null;
  kcalPer100g: number | null;
  packageGrams: number | null;
};

export type ResolveFoodInput = {
  foodProductId?: string;
  source?: FoodSource;
  externalId?: string;
  ean?: string;
};
