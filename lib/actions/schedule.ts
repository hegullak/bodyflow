"use server";

import { and, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { scheduledSessions } from "@/db/schema";
import { requireUserId } from "@/lib/auth/current-user";

export type CardioSlug = "longrun" | "tempo-run" | "4x4-interval" | "interval";

export const CARDIO_TYPES: { slug: CardioSlug; name: string; nameNo: string }[] = [
  { slug: "longrun",      name: "Long Run",     nameNo: "Langøkt" },
  { slug: "tempo-run",    name: "Tempo Run",    nameNo: "Tempoøkt" },
  { slug: "4x4-interval", name: "4x4 Interval", nameNo: "4x4 intervall" },
  { slug: "interval",     name: "Interval",     nameNo: "Intervall" },
];

export const RUN_IMAGE_URL = "https://static.exercisedb.dev/media/oLrKqDH.gif";

export async function getScheduledSessionsForMonth(year: number, month: number) {
  const userId = await requireUserId();
  const db = getDb();
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = `${year}-${String(month).padStart(2, "0")}-31`;

  return db
    .select({
      id: scheduledSessions.id,
      date: scheduledSessions.date,
      programId: scheduledSessions.programId,
      cardioSlug: scheduledSessions.cardioSlug,
      isCompleted: scheduledSessions.isCompleted,
      completedAt: scheduledSessions.completedAt,
      notes: scheduledSessions.notes,
    })
    .from(scheduledSessions)
    .where(
      and(
        eq(scheduledSessions.userId, userId),
        gte(scheduledSessions.date, from),
        lte(scheduledSessions.date, to),
      ),
    )
    .orderBy(scheduledSessions.date);
}

export async function getScheduledSessionsForRange(from: string, to: string) {
  const userId = await requireUserId();
  const db = getDb();
  return db
    .select({
      id: scheduledSessions.id,
      date: scheduledSessions.date,
      programId: scheduledSessions.programId,
      cardioSlug: scheduledSessions.cardioSlug,
      isCompleted: scheduledSessions.isCompleted,
      completedAt: scheduledSessions.completedAt,
      notes: scheduledSessions.notes,
    })
    .from(scheduledSessions)
    .where(
      and(
        eq(scheduledSessions.userId, userId),
        gte(scheduledSessions.date, from),
        lte(scheduledSessions.date, to),
      ),
    )
    .orderBy(scheduledSessions.date);
}

export async function getTodayScheduledSessions(today: string) {
  const userId = await requireUserId();
  const db = getDb();
  return db
    .select()
    .from(scheduledSessions)
    .where(
      and(eq(scheduledSessions.userId, userId), eq(scheduledSessions.date, today)),
    )
    .orderBy(scheduledSessions.createdAt);
}

export async function addScheduledSessionAction(
  date: string,
  opts: { programId: string } | { cardioSlug: CardioSlug },
): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const db = getDb();
  await db.insert(scheduledSessions).values({
    userId,
    date,
    programId: "programId" in opts ? opts.programId : null,
    cardioSlug: "cardioSlug" in opts ? opts.cardioSlug : null,
  });
  revalidatePath("/training/planner");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function toggleScheduledSessionAction(id: string): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const db = getDb();
  const [row] = await db
    .select({ isCompleted: scheduledSessions.isCompleted })
    .from(scheduledSessions)
    .where(and(eq(scheduledSessions.id, id), eq(scheduledSessions.userId, userId)));
  if (!row) return { ok: false };

  const nowCompleted = !row.isCompleted;
  await db
    .update(scheduledSessions)
    .set({
      isCompleted: nowCompleted,
      completedAt: nowCompleted ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(scheduledSessions.id, id));

  revalidatePath("/dashboard");
  revalidatePath("/training/planner");
  return { ok: true };
}

export async function deleteScheduledSessionAction(id: string): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const db = getDb();
  await db
    .delete(scheduledSessions)
    .where(and(eq(scheduledSessions.id, id), eq(scheduledSessions.userId, userId)));
  revalidatePath("/training/planner");
  revalidatePath("/dashboard");
  return { ok: true };
}
