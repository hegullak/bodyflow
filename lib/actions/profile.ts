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
    age: formData.get("age") ?? "",
    heightCm: formData.get("heightCm") ?? "",
    weightKg: formData.get("weightKg") ?? "",
    activityLevel: formData.get("activityLevel"),
    targetWeightKg: formData.get("targetWeightKg") ?? "",
    preferredUnits: formData.get("preferredUnits"),
    goal: formData.get("goal") || "maintenance",
    dailyCalorieTarget: formData.get("dailyCalorieTarget") ?? "",
    birthYear: formData.get("birthYear") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the highlighted fields.",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }

  const currentYear = new Date().getFullYear();
  const birthYear = parsed.data.age != null
    ? currentYear - parsed.data.age
    : (parsed.data.birthYear ?? null);

  const db = getDb();
  const values = {
    userId,
    sex: parsed.data.sex ?? null,
    birthYear,
    heightCm: parsed.data.heightCm ?? null,
    weightKg: parsed.data.weightKg ?? null,
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
        weightKg: values.weightKg,
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

export async function updateLanguageAction(lang: "no" | "en"): Promise<void> {
  const userId = await requireUserId();
  const db = getDb();
  await db
    .update(userProfiles)
    .set({ language: lang, updatedAt: new Date() })
    .where(eq(userProfiles.userId, userId));
  revalidatePath("/", "layout");
}

export async function getProfileForUser(userId: string) {
  const db = getDb();
  return (
    (await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    })) ?? null
  );
}
