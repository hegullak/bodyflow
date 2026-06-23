import type { FoodProductSummary } from "@/lib/foods/types";

const SOURCE_ORDER = { matvaretabellen: 0, kassal: 1, custom: 2 } as const;

export function sourceLabel(p: FoodProductSummary): string {
  if (p.source === "matvaretabellen") return "Matvaretabellen";
  if (p.source === "custom") return p.name.split(":")[0]?.trim() ?? "Egendefinert";
  return p.brand ? `Kassal.app · ${p.brand}` : "Kassal.app";
}

export function groupResults(products: FoodProductSummary[]): Array<{ title: string; items: FoodProductSummary[] }> {
  const sorted = [...products].sort(
    (a, b) => (SOURCE_ORDER[a.source] ?? 9) - (SOURCE_ORDER[b.source] ?? 9),
  );
  const groups: Array<{ title: string; items: FoodProductSummary[] }> = [];
  for (const p of sorted) {
    const title =
      p.source === "kassal" ? "Kassal.app"
      : p.source === "matvaretabellen" ? "Matvaretabellen"
      : "Egne produkter";
    const last = groups[groups.length - 1];
    if (last?.title === title) last.items.push(p);
    else groups.push({ title, items: [p] });
  }
  return groups;
}
