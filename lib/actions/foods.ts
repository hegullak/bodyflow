"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { foodProducts } from "@/db/schema";
import { requireUserId } from "@/lib/auth/current-user";

export async function setPrettyNameAction(
  foodProductId: string,
  prettyName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireUserId();
    const db = getDb();
    const value = prettyName.trim() || null;
    await db
      .update(foodProducts)
      .set({ prettyName: value, updatedAt: new Date() })
      .where(eq(foodProducts.id, foodProductId));
    return { ok: true };
  } catch {
    return { ok: false, error: "Kunne ikke lagre navn." };
  }
}
