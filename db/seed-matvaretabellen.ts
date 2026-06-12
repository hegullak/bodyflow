import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { getDb } from "@/db/client";
import { foodProducts } from "@/db/schema";
import type { MatvaretabellenFoodsResponse } from "@/lib/matvaretabellen/types";

const MATVARETABELLEN_URL = "https://www.matvaretabellen.no/api/nb/foods.json";

function buildSearchText(name: string, keywords: string[] = []): string {
  return [name, ...keywords].join(" ").toLowerCase().replace(/\s+/g, " ").trim();
}

async function main() {
  console.log("[seed-matvaretabellen] fetching foods...");
  const res = await fetch(MATVARETABELLEN_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch matvaretabellen: ${res.status}`);
  }

  const json = (await res.json()) as MatvaretabellenFoodsResponse;
  const foods = json.foods ?? [];
  console.log(`[seed-matvaretabellen] upserting ${foods.length} foods...`);

  const db = getDb();
  let inserted = 0;
  let skipped = 0;

  for (const food of foods) {
    const kcal = food.calories?.quantity;
    if (kcal == null || !Number.isFinite(kcal) || kcal <= 0) {
      skipped += 1;
      continue;
    }

    await db
      .insert(foodProducts)
      .values({
        source: "matvaretabellen",
        externalId: String(food.foodId),
        name: food.foodName,
        kcalPer100g: kcal,
        searchText: buildSearchText(food.foodName, food.searchKeywords ?? []),
        fetchedAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [foodProducts.source, foodProducts.externalId],
        set: {
          name: food.foodName,
          kcalPer100g: kcal,
          searchText: buildSearchText(food.foodName, food.searchKeywords ?? []),
          fetchedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    inserted += 1;
  }

  console.log(`[seed-matvaretabellen] done. upserted=${inserted} skipped=${skipped}`);
}

main().catch((err) => {
  console.error("[seed-matvaretabellen] failed:", err);
  process.exit(1);
});
