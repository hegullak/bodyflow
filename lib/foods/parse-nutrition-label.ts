export type ParsedNutritionLabel = {
  name: string | null;
  brand: string | null;
  ean: string | null;
  kcalPer100g: number | null;
  packageGrams: number | null;
};

function parseNumber(value: string): number | null {
  const normalized = value.replace(",", ".").trim();
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function kjToKcal(kj: number): number {
  return Math.round(kj / 4.184);
}

export function parseEanFromText(text: string): string | null {
  const matches = text.match(/\b(\d{8}|\d{13}|\d{14})\b/g);
  if (!matches?.length) return null;
  return matches.find((m) => m.length >= 8) ?? null;
}

export function parseKcalPer100gFromText(text: string): number | null {
  const normalized = text.replace(/\s+/g, " ");

  const kcalPatterns = [
    /(?:energi|energy)[^.\n]{0,40}?(\d+[,.]?\d*)\s*kcal/i,
    /(\d+[,.]?\d*)\s*kcal[^.\n]{0,30}?per\s*100\s*g/i,
    /per\s*100\s*g[^.\n]{0,40}?(\d+[,.]?\d*)\s*kcal/i,
    /(\d+[,.]?\d*)\s*kcal\s*\/\s*100\s*g/i,
  ];

  for (const pattern of kcalPatterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      const kcal = parseNumber(match[1]);
      if (kcal != null && kcal > 0 && kcal < 1000) return Math.round(kcal);
    }
  }

  const kjPatterns = [
    /(?:energi|energy)[^.\n]{0,40}?(\d+[,.]?\d*)\s*k?j\b/i,
    /(\d+[,.]?\d*)\s*k?j[^.\n]{0,30}?per\s*100\s*g/i,
    /per\s*100\s*g[^.\n]{0,40}?(\d+[,.]?\d*)\s*k?j\b/i,
  ];

  for (const pattern of kjPatterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      const kj = parseNumber(match[1]);
      if (kj != null && kj > 0) return kjToKcal(kj);
    }
  }

  return null;
}

export function parsePackageGramsFromText(text: string): number | null {
  const match = text.match(/(\d+[,.]?\d*)\s*(g|kg|ml)\b/i);
  if (!match) return null;
  const amount = parseNumber(match[1]);
  if (amount == null) return null;
  const unit = match[2].toLowerCase();
  if (unit === "kg") return Math.round(amount * 1000);
  return Math.round(amount);
}

export function parseNutritionLabelText(text: string, eanHint?: string | null): ParsedNutritionLabel {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const name =
    lines.find((line) => line.length > 3 && !/^\d/.test(line) && !/energi|kcal|nærings/i.test(line)) ??
    null;

  return {
    name,
    brand: null,
    ean: eanHint?.replace(/\D/g, "") || parseEanFromText(text),
    kcalPer100g: parseKcalPer100gFromText(text),
    packageGrams: parsePackageGramsFromText(text),
  };
}
