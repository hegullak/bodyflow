"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/current-user";
import { logger } from "@/lib/logger";
import { disconnectWithings, syncWithingsForUser } from "@/lib/withings/sync";

export async function disconnectWithingsAction() {
  const userId = await requireUserId();
  await disconnectWithings(userId);
  logger.info("Withings", "Connection disconnected", { userId });
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  redirect("/profile?withings=disconnected");
}

// Unix timestamp for 2010-01-01 — covers all realistic Withings history
const FULL_HISTORY_START = 1262304000;

export async function backfillWithingsHistoryAction(): Promise<{ ok: boolean; applied: number; error?: string }> {
  const userId = await requireUserId();
  const result = await syncWithingsForUser(userId, {
    force: true,
    startdate: FULL_HISTORY_START,
    enddate: Math.floor(Date.now() / 1000),
  });
  if (result.synced) {
    revalidatePath("/statistics");
    revalidatePath("/check-in");
    revalidatePath("/dashboard");
    logger.info("Withings", "Full history backfill completed", { userId, applied: result.applied });
    return { ok: true, applied: result.applied };
  }
  return { ok: false, applied: 0, error: result.reason };
}
