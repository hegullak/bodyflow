"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { bodyMeasurements } from "@/db/schema";
import { requireUserId } from "@/lib/auth/current-user";
import { scopeBy } from "@/lib/auth/scope";
import { measurementFormSchema } from "@/lib/validation/measurement";
import { type ActionResult, flattenZodErrors } from "@/shared/actions/types";

export async function upsertMeasurementAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = measurementFormSchema.safeParse({
    measuredOn: formData.get("measuredOn"),
    chestCm: formData.get("chestCm") ?? "",
    waistCm: formData.get("waistCm") ?? "",
    hipCm: formData.get("hipCm") ?? "",
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the highlighted fields.",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }

  if (
    parsed.data.chestCm == null &&
    parsed.data.waistCm == null &&
    parsed.data.hipCm == null
  ) {
    return {
      ok: false,
      error: "Add at least one measurement.",
      fieldErrors: { waistCm: ["Enter at least one value"] },
    };
  }

  const db = getDb();
  const values = {
    userId,
    measuredOn: parsed.data.measuredOn,
    chestCm: parsed.data.chestCm ?? null,
    waistCm: parsed.data.waistCm ?? null,
    hipCm: parsed.data.hipCm ?? null,
    note: parsed.data.note ?? null,
    updatedAt: new Date(),
  };

  await db
    .insert(bodyMeasurements)
    .values(values)
    .onConflictDoUpdate({
      target: [bodyMeasurements.userId, bodyMeasurements.measuredOn],
      set: {
        chestCm: values.chestCm,
        waistCm: values.waistCm,
        hipCm: values.hipCm,
        note: values.note,
        updatedAt: values.updatedAt,
      },
    });

  revalidatePath("/check-in");
  revalidatePath("/statistics");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export async function getMeasurementForDate(userId: string, measuredOn: string) {
  const db = getDb();
  return (
    (await db.query.bodyMeasurements.findFirst({
      where: scopeBy(bodyMeasurements.userId, userId, eq(bodyMeasurements.measuredOn, measuredOn)),
    })) ?? null
  );
}
