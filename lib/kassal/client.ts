import { getKassalConfig } from "./config";
import {
  calculateCaloriesFromGrams,
  getKcalPer100g,
  packageWeightToGrams,
} from "./nutrition";
import type {
  KassalEanResponse,
  KassalProduct,
  KassalProductSummary,
  KassalSearchResponse,
} from "./types";

export class KassalNotConfiguredError extends Error {
  constructor() {
    super("KASSAL_API_KEY is not configured");
    this.name = "KassalNotConfiguredError";
  }
}

export class KassalApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "KassalApiError";
    this.status = status;
  }
}

async function kassalFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getKassalConfig();
  if (!config) throw new KassalNotConfiguredError();

  const res = await fetch(`${config.apiBase}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      ...init?.headers,
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new KassalApiError(res.status, body || `Kassal API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

function toSummary(product: KassalProduct): KassalProductSummary {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    ean: product.ean,
    image: product.image,
    kcalPer100g: getKcalPer100g(product.nutrition ?? []),
    packageGrams: packageWeightToGrams(product.weight, product.weight_unit),
  };
}

export async function searchKassalProducts(query: string, size = 20): Promise<KassalProductSummary[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const params = new URLSearchParams({
    search: trimmed,
    size: String(size),
  });

  const json = await kassalFetch<KassalSearchResponse>(`/products?${params}`);
  return (json.data ?? []).map(toSummary);
}

export async function findKassalProductById(id: string): Promise<KassalProductSummary | null> {
  const productId = Number(id);
  if (!Number.isFinite(productId) || productId <= 0) return null;

  const json = await kassalFetch<{ data: KassalProduct }>(
    `/products/id/${encodeURIComponent(String(productId))}`,
  );
  if (!json.data) return null;
  return toSummary(json.data);
}

export async function findKassalProductByEan(ean: string): Promise<KassalProductSummary | null> {
  const normalized = ean.replace(/\D/g, "");
  if (!normalized) return null;

  const json = await kassalFetch<KassalEanResponse>(`/products/ean/${encodeURIComponent(normalized)}`);
  const data = json.data;
  if (!data?.products?.length) return null;

  const primary = data.products[0];
  const kcalPer100g = getKcalPer100g(data.nutrition ?? []);

  return {
    id: Number(primary.id),
    name: primary.name,
    brand: primary.brand || null,
    ean: data.ean,
    image: primary.image || null,
    kcalPer100g,
    packageGrams: packageWeightToGrams(primary.weight, primary.weight_unit),
  };
}

export function buildMealCalories(kcalPer100g: number, quantityGrams: number): number {
  return calculateCaloriesFromGrams(kcalPer100g, quantityGrams);
}
