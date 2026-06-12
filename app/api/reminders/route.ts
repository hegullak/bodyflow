import { NextResponse } from "next/server";
import { getActiveRemindersForUser } from "@/lib/actions/reminders";
import { requireUserId } from "@/lib/auth/current-user";
import { REMINDER_DEFINITIONS } from "@/lib/reminders/constants";

export async function GET() {
  const userId = await requireUserId();
  const rows = await getActiveRemindersForUser(userId);

  return NextResponse.json({
    data: rows.map((row) => {
      const definition = REMINDER_DEFINITIONS[row.reminderType];
      return {
        id: row.id,
        reminderType: row.reminderType,
        enabled: row.enabled,
        weekdays: row.weekdays,
        reminderTime: row.reminderTime,
        timezone: row.timezone,
        targetRoute: row.targetRoute,
        notificationTitle: definition.notificationTitle,
        notificationBody: definition.notificationBody,
      };
    }),
  });
}
