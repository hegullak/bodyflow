/**
 * One-time script: generate pretty_name for all food_products that lack one.
 *
 * Strategy by source:
 *   matvaretabellen — replace ", " with " " (removes database comma notation)
 *   kassal / custom  — strip quantity/size tokens (200g, 3x198g, 10stk, 2pk, 1,25l …)
 *                      then trim dangling punctuation; keep brand names.
 *
 * Run: npx tsx --env-file=.env.local scripts/generate-pretty-names.ts
 */

import { eq, isNull } from "drizzle-orm";
import { getDb } from "../db/client";
import { foodProducts } from "../db/schema";

const MEASURE_RE = [
  // "3x198g", "2 x 400 ml" etc.
  /\b\d+\s*[xX]\s*\d+[\.,]?\d*\s*(g|kg|ml|l|dl|cl)\b/gi,
  // "200g", "1,25l", "3.5 kg", "500 ml"
  /\b\d+[\.,]?\d*\s*(g|kg|ml|l|dl|cl)\b/gi,
  // "10 stk", "3pk", "2 pakk", "3 pack"
  /\b\d+\s*(stk|pk|pakk|pack)\b/gi,
];

function pretty(name: string, source: string): string {
  if (source === "matvaretabellen") {
    // "Egg, kokt" → "Egg kokt" | "Melk, helmelk, 1,5%" → "Melk helmelk 1,5%"
    return name.replace(/,\s+/g, " ").trim();
  }

  // kassal / custom: strip measurement tokens
  let out = name;
  for (const re of MEASURE_RE) out = out.replace(re, "");

  // collapse spaces, strip leading/trailing junk
  out = out.replace(/\s+/g, " ").replace(/^[\s,.\-–]+|[\s,.\-–]+$/g, "").trim();

  return out || name; // fall back to original if result would be empty
}

async function main() {
  const db = getDb();

  const rows = await db
    .select({ id: foodProducts.id, name: foodProducts.name, source: foodProducts.source })
    .from(foodProducts)
    .where(isNull(foodProducts.prettyName));

  console.log(`Found ${rows.length} products without a prettyName.`);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const candidate = pretty(row.name, row.source);

    // Skip if the generated name is identical to the original
    if (candidate === row.name) {
      skipped++;
      continue;
    }

    await db
      .update(foodProducts)
      .set({ prettyName: candidate, updatedAt: new Date() })
      .where(eq(foodProducts.id, row.id));

    updated++;
  }

  console.log(`Done — updated: ${updated}, unchanged (skipped): ${skipped}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
