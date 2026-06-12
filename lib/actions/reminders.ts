"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { reminders, type Reminder, type ReminderType } from "@/db/schema";
import { requireUserId } from "@/lib/auth/current-user";
import { scopeBy } from "@/lib/auth/scope";
import { REMINDER_DEFINITIONS } from "@/lib/reminders/constants";
import { upsertReminderSchema } from "@/lib/validation/reminder";
import { type ActionResult, flattenZodErrors } from "./types";

function activeReminderFilter(userId: string, reminderType?: ReminderType) {
  return scopeBy(
    reminders.userId,
    userId,
    isNull(reminders.deletedAt),
    reminderType ? eq(reminders.reminderType, reminderType) : undefined,
  );
}

export async function getReminderForUser(
  userId: string,
  reminderType: ReminderType,
): Promise<Reminder | null> {
  const db = getDb();
  return (
    (await db.query.reminders.findFirst({
      where: activeReminderFilter(userId, reminderType),
    })) ?? null
  );
}

export async function getActiveRemindersForUser(userId: string): Promise<Reminder[]> {
  const db = getDb();
  return db.query.reminders.findMany({
    where: activeReminderFilter(userId),
  });
}

export async function upsertReminderAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const weekdayValues = formData.getAll("weekdays").map((value) => Number(value));

  const parsed = upsertReminderSchema.safeParse({
    reminderType: formData.get("reminderType"),
    enabled: formData.get("enabled") === "on" || formData.get("enabled") === "true",
    weekdays: weekdayValues,
    reminderTime: formData.get("reminderTime"),
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the highlighted fields.",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }

  const definition = REMINDER_DEFINITIONS[parsed.data.reminderType];
  const db = getDb();
  const existing = await getReminderForUser(userId, parsed.data.reminderType);
  const now = new Date();

  const values = {
    userId,
    reminderType: parsed.data.reminderType,
    enabled: parsed.data.enabled,
    weekdays: parsed.data.weekdays,
    reminderTime: parsed.data.reminderTime,
    timezone: parsed.data.timezone,
    targetRoute: definition.defaultTargetRoute,
    updatedAt: now,
  };

  if (existing) {
    await db
      .update(reminders)
      .set(values)
      .where(eq(reminders.id, existing.id));
  } else {
    await db.insert(reminders).values(values);
  }

  revalidatePath("/profile");
  return { ok: true, data: undefined };
}

export async function markReminderTriggeredAction(reminderId: string): Promise<void> {
  const userId = await requireUserId();
  const db = getDb();
  await db
    .update(reminders)
    .set({ lastTriggeredAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(reminders.id, reminderId),
        scopeBy(reminders.userId, userId, isNull(reminders.deletedAt)),
      ),
    );
}
