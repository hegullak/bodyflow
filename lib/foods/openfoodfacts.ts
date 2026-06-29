export interface OpenFoodFactsProduct {
  code: string;
  product_name?: string;
  brands?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    "energy-kj_100g"?: number;
  };
  image_front_url?: string;
  quantity?: string;
}

export interface FoodFactsProductSummary {
  ean: string;
  name: string;
  brand?: string;
  kcalPer100g: number;
  image?: string;
  packageGrams?: number;
}

async function parseQuantityToGrams(quantity?: string): Promise<number | null> {
  if (!quantity) return null;

  const match = quantity.match(/(\d+)\s*(g|gram|kg|ml|l)?/i);
  if (!match) return null;

  let grams = parseInt(match[1], 10);
  const unit = match[2]?.toLowerCase();

  if (unit === "kg") grams *= 1000;
  if (unit === "l" || unit === "ml") grams = Math.round(grams); // Approximate ml ≈ g

  return grams > 0 ? grams : null;
}

export async function fetchFromOpenFoodFacts(ean: string): Promise<FoodFactsProductSummary | null> {
  const normalized = ean.replace(/\D/g, "");
  if (!normalized) return null;

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${normalized}.json`,
      { headers: { "User-Agent": "bodyflow/1.0" } },
    );

    if (!response.ok) return null;

    const data = (await response.json()) as { product?: OpenFoodFactsProduct };
    const product = data.product;

    if (!product?.product_name) return null;

    const kcalPer100g =
      product.nutriments?.["energy-kcal_100g"] ??
      (product.nutriments?.["energy-kj_100g"] ? product.nutriments["energy-kj_100g"] / 4.184 : null);

    if (!kcalPer100g) return null;

    return {
      ean: normalized,
      name: product.product_name,
      brand: product.brands || undefined,
      kcalPer100g,
      image: product.image_front_url || undefined,
      packageGrams: (await parseQuantityToGrams(product.quantity)) || undefined,
    };
  } catch {
    return null;
  }
}
