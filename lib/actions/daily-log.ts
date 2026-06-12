"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { dailyBodyLogs } from "@/db/schema";
import { requireUserId } from "@/lib/auth/current-user";
import { scopeBy } from "@/lib/auth/scope";
import { dailyLogFormSchema } from "@/lib/validation/daily-log";
import { type ActionResult, flattenZodErrors } from "./types";

export async function upsertDailyLogAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = dailyLogFormSchema.safeParse({
    logDate: formData.get("logDate"),
    weightKg: formData.get("weightKg") ?? "",
    calorieIntake: formData.get("calorieIntake") ?? "",
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the highlighted fields.",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }

  if (parsed.data.weightKg == null && parsed.data.calorieIntake == null) {
    return {
      ok: false,
      error: "Add at least weight or calorie intake.",
      fieldErrors: {
        weightKg: ["Enter weight or calories"],
        calorieIntake: ["Enter weight or calories"],
      },
    };
  }

  const db = getDb();
  const values = {
    userId,
    logDate: parsed.data.logDate,
    weightKg: parsed.data.weightKg ?? null,
    calorieIntake: parsed.data.calorieIntake ?? null,
    note: parsed.data.note ?? null,
    updatedAt: new Date(),
  };

  await db
    .insert(dailyBodyLogs)
    .values(values)
    .onConflictDoUpdate({
      target: [dailyBodyLogs.userId, dailyBodyLogs.logDate],
      set: {
        weightKg: values.weightKg,
        calorieIntake: values.calorieIntake,
        note: values.note,
        updatedAt: values.updatedAt,
      },
    });

  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export async function getDailyLogForDate(userId: string, logDate: string) {
  const db = getDb();
  return (
    (await db.query.dailyBodyLogs.findFirst({
      where: scopeBy(dailyBodyLogs.userId, userId, eq(dailyBodyLogs.logDate, logDate)),
    })) ?? null
  );
}

export async function getRecentDailyLogs(userId: string, limit = 30) {
  const db = getDb();
  return db.query.dailyBodyLogs.findMany({
    where: scopeBy(dailyBodyLogs.userId, userId),
    orderBy: (logs, { desc }) => [desc(logs.logDate)],
    limit,
  });
}
