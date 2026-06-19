import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { userProfiles } from "@/db/schema";
import { requireUserId } from "@/lib/auth/current-user";
import { getTranslations } from "./index";
import type { Lang } from "./types";

export const getLang = cache(async (): Promise<Lang> => {
  try {
    const userId = await requireUserId();
    const db = getDb();
    const row = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
      columns: { language: true },
    });
    const lang = row?.language;
    return lang === "en" || lang === "no" ? lang : "no";
  } catch {
    return "no";
  }
});

export const getT = cache(async () => {
  const lang = await getLang();
  return getTranslations(lang);
});
