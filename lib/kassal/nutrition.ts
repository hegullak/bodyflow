import type { KassalNutritionItem } from "./types";

const KCAL_CODE_HINTS = ["kcal", "energi", "energy", "kalorier"];

function isKcalUnit(unit: string): boolean {
  const u = unit.toLowerCase();
  return u === "kcal" || u === "kkal";
}

function isKjUnit(unit: string): boolean {
  return unit.toLowerCase() === "kj";
}

export function kjToKcal(kj: number): number {
  return kj / 4.184;
}

export function getKcalPer100g(nutrition: KassalNutritionItem[]): number | null {
  for (const item of nutrition) {
    const code = item.code.toLowerCase();
    const label = item.display_name.toLowerCase();

    const looksLikeEnergy =
      KCAL_CODE_HINTS.some((hint) => code.includes(hint) || label.includes(hint)) &&
      !code.includes("kj") &&
      !label.includes("kj");

    if (!looksLikeEnergy) continue;

    if (isKcalUnit(item.unit)) return item.amount;
    if (isKjUnit(item.unit)) return kjToKcal(item.amount);
  }

  for (const item of nutrition) {
    const label = `${item.code} ${item.display_name}`.toLowerCase();
    if (!label.includes("kj")) continue;
    if (isKjUnit(item.unit)) return kjToKcal(item.amount);
  }

  return null;
}

export function calculateCaloriesFromGrams(kcalPer100g: number, quantityGrams: number): number {
  return Math.round((kcalPer100g * quantityGrams) / 100);
}

export function packageWeightToGrams(
  weight: number | null | undefined,
  unit: string | null | undefined,
): number | null {
  if (weight == null || !unit) return null;
  const u = unit.toLowerCase();
  if (u === "g") return weight;
  if (u === "kg") return weight * 1000;
  if (u === "hg") return weight * 100;
  if (u === "ml" || u === "cl" || u === "dl" || u === "l") {
    const ml =
      u === "ml" ? weight : u === "cl" ? weight * 10 : u === "dl" ? weight * 100 : weight * 1000;
    return ml;
  }
  return null;
}
