"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { userProfiles } from "@/db/schema";
import { requireUserId } from "@/lib/auth/current-user";

export async function updateLookingForwardToAction(value: string) {
  const userId = await requireUserId();
  const db = getDb();
  await db
    .update(userProfiles)
    .set({ lookingForwardTo: value.trim() || null, updatedAt: new Date() })
    .where(eq(userProfiles.userId, userId));
}

export async function updateVibeAction(vibe: string | null) {
  const userId = await requireUserId();
  const db = getDb();
  await db
    .update(userProfiles)
    .set({ vibe: vibe || null, updatedAt: new Date() })
    .where(eq(userProfiles.userId, userId));
}
