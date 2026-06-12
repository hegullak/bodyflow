export type KassalNutritionItem = {
  code: string;
  display_name: string;
  amount: number;
  unit: string;
};

export type KassalProduct = {
  id: number;
  name: string;
  brand: string | null;
  ean: string | null;
  image: string | null;
  weight: number | null;
  weight_unit: string | null;
  nutrition: KassalNutritionItem[];
};

export type KassalProductSummary = {
  id: number;
  name: string;
  brand: string | null;
  ean: string | null;
  image: string | null;
  kcalPer100g: number | null;
  packageGrams: number | null;
};

export type KassalSearchResponse = {
  data: KassalProduct[];
};

export type KassalEanResponse = {
  data: {
    ean: string;
    products: Array<{
      id: string;
      name: string;
      brand: string;
      image: string;
      weight: number;
      weight_unit: string;
    }>;
    nutrition: KassalNutritionItem[];
  };
};
