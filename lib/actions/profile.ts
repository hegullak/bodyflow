"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { userProfiles } from "@/db/schema";
import { requireUserId } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { profileFormSchema } from "@/lib/validation/profile";
import { type ActionResult, flattenZodErrors } from "./types";

export async function upsertProfileAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = profileFormSchema.safeParse({
    sex: formData.get("sex") || undefined,
    birthYear: formData.get("birthYear") ?? "",
    heightCm: formData.get("heightCm"),
    activityLevel: formData.get("activityLevel"),
    goal: formData.get("goal"),
    targetWeightKg: formData.get("targetWeightKg") ?? "",
    dailyCalorieTarget: formData.get("dailyCalorieTarget") ?? "",
    preferredUnits: formData.get("preferredUnits"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the highlighted fields.",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }

  const db = getDb();
  const values = {
    userId,
    sex: parsed.data.sex ?? null,
    birthYear: parsed.data.birthYear ?? null,
    heightCm: parsed.data.heightCm,
    activityLevel: parsed.data.activityLevel,
    goal: parsed.data.goal,
    targetWeightKg: parsed.data.targetWeightKg ?? null,
    dailyCalorieTarget: parsed.data.dailyCalorieTarget ?? null,
    preferredUnits: parsed.data.preferredUnits,
    updatedAt: new Date(),
  };

  const [upserted] = await db
    .insert(userProfiles)
    .values(values)
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: {
        sex: values.sex,
        birthYear: values.birthYear,
        heightCm: values.heightCm,
        activityLevel: values.activityLevel,
        goal: values.goal,
        targetWeightKg: values.targetWeightKg,
        dailyCalorieTarget: values.dailyCalorieTarget,
        preferredUnits: values.preferredUnits,
        updatedAt: values.updatedAt,
      },
    })
    .returning({ id: userProfiles.id });

  await writeAuditLog({
    entityType: "user_profile",
    entityId: upserted.id,
    action: "update",
    changedBy: userId,
  });

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return { ok: true, data: undefined };
}

export async function getProfileForUser(userId: string) {
  const db = getDb();
  return (
    (await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    })) ?? null
  );
}
