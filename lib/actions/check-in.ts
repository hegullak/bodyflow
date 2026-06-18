"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { bodyMeasurements, dailyBodyLogs } from "@/db/schema";
import { requireUserId } from "@/lib/auth/current-user";
import { scopeBy } from "@/lib/auth/scope";
import {
  computeCheckInDiff,
  getCheckInForDate,
  getCheckInHistory,
  getPreviousCheckIn,
  type CheckInDiff,
  type CheckInSnapshot,
} from "@/lib/queries/check-in";
import { checkInFormSchema } from "@/lib/validation/check-in";
import { type ActionResult, flattenZodErrors } from "./types";

export type CheckInActionResult = ActionResult<{ diff: CheckInDiff | null }>;

export async function upsertCheckInAction(
  _prev: CheckInActionResult | null,
  formData: FormData,
): Promise<CheckInActionResult> {
  const userId = await requireUserId();
  const parsed = checkInFormSchema.safeParse({
    logDate: formData.get("logDate"),
    weightKg: formData.get("weightKg") ?? "",
    waistCm: formData.get("waistCm") ?? "",
    chestCm: formData.get("chestCm") ?? "",
    hipCm: formData.get("hipCm") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the highlighted fields.",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }

  const { logDate, weightKg, waistCm, chestCm, hipCm } = parsed.data;

  if (
    weightKg == null &&
    waistCm == null &&
    chestCm == null &&
    hipCm == null
  ) {
    return {
      ok: false,
      error: "Fyll inn minst én verdi.",
      fieldErrors: { weightKg: ["Fyll inn minst én verdi"] },
    };
  }

  const historyBefore = await getCheckInHistory(userId, 30);
  const previous = getPreviousCheckIn(historyBefore, logDate);

  const db = getDb();
  const now = new Date();

  if (weightKg != null) {
    await db
      .insert(dailyBodyLogs)
      .values({
        userId,
        logDate,
        weightKg,
        weightSource: "manual",
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [dailyBodyLogs.userId, dailyBodyLogs.logDate],
        set: {
          weightKg,
          weightSource: "manual",
          updatedAt: now,
        },
      });
  }

  if (waistCm != null || chestCm != null || hipCm != null) {
    const existing = await db.query.bodyMeasurements.findFirst({
      where: scopeBy(bodyMeasurements.userId, userId, eq(bodyMeasurements.measuredOn, logDate)),
    });

    const merged = {
      waistCm: waistCm ?? existing?.waistCm ?? null,
      chestCm: chestCm ?? existing?.chestCm ?? null,
      hipCm: hipCm ?? existing?.hipCm ?? null,
    };

    await db
      .insert(bodyMeasurements)
      .values({
        userId,
        measuredOn: logDate,
        ...merged,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [bodyMeasurements.userId, bodyMeasurements.measuredOn],
        set: {
          ...merged,
          updatedAt: now,
        },
      });
  }

  const saved = await getCheckInForDate(userId, logDate);
  const diff = saved ? computeCheckInDiff(saved, previous) : null;

  revalidatePath("/check-in");
  revalidatePath("/statistics");
  revalidatePath("/dashboard");

  return { ok: true, data: { diff } };
}

const HISTORY_PAGE = 5;
const HISTORY_FETCH_LIMIT = 200;

export async function getCheckInBundle(userId: string, logDate: string) {
  const [history, today] = await Promise.all([
    getCheckInHistory(userId, HISTORY_FETCH_LIMIT),
    getCheckInForDate(userId, logDate),
  ]);

  const todayEntry = today ?? { logDate, weightKg: null, waistCm: null, chestCm: null, hipCm: null };
  const historyWithoutToday = history.filter((row) => row.logDate !== logDate);
  const initial = historyWithoutToday.slice(0, HISTORY_PAGE);
  const hasMore = historyWithoutToday.length > HISTORY_PAGE;

  return { today: todayEntry, initial, hasMore };
}

export async function deleteCheckInAction(logDate: string): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const db = getDb();
  await Promise.all([
    db
      .update(dailyBodyLogs)
      .set({ weightKg: null, weightSource: null, updatedAt: new Date() })
      .where(scopeBy(dailyBodyLogs.userId, userId, eq(dailyBodyLogs.logDate, logDate))),
    db
      .delete(bodyMeasurements)
      .where(scopeBy(bodyMeasurements.userId, userId, eq(bodyMeasurements.measuredOn, logDate))),
  ]);
  revalidatePath("/check-in");
  revalidatePath("/statistics");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function getCheckInHistoryPageAction(
  offset: number,
): Promise<CheckInSnapshot[]> {
  const userId = await requireUserId();
  const history = await getCheckInHistory(userId, HISTORY_FETCH_LIMIT);
  const today = (await import("@/lib/utils")).todayIsoDate();
  return history.filter((row) => row.logDate !== today).slice(offset, offset + HISTORY_PAGE);
}
