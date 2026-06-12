import type { ReminderType } from "@/db/schema";

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const WEEKDAY_SHORT_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

export type ReminderDefinition = {
  type: ReminderType;
  label: string;
  description: string;
  defaultTargetRoute: string;
  notificationTitle: string;
  notificationBody: string;
};

export const REMINDER_DEFINITIONS: Record<ReminderType, ReminderDefinition> = {
  weigh_in: {
    type: "weigh_in",
    label: "Weigh-in",
    description: "Remind me to log weight on selected days.",
    defaultTargetRoute: "/check-in?focus=weight",
    notificationTitle: "Time to weigh in",
    notificationBody: "Log your weight in bodyflow.",
  },
};

export function getDefaultTimezone(): string {
  if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  }
  return "UTC";
}
