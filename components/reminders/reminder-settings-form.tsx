"use client";

import { useActionState, useEffect, useState } from "react";
import { ClientOnly } from "@/components/client-only";
import type { Reminder } from "@/db/schema";
import { upsertReminderAction } from "@/lib/actions/reminders";
import {
  ensureNotificationPermission,
  fetchAndScheduleReminders,
} from "@/lib/reminders/client-scheduler";
import {
  getDefaultTimezone,
  REMINDER_DEFINITIONS,
  WEEKDAY_SHORT_LABELS,
} from "@/lib/reminders/constants";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { useT } from "@/components/providers/lang-provider";

function readNotificationPermission(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function ReminderSettingsFormInner({
  reminderType,
  reminder,
}: {
  reminderType: "weigh_in";
  reminder: Reminder | null;
}) {
  const t = useT();
  const r = t.profile;
  const definition = REMINDER_DEFINITIONS[reminderType];
  const [state, formAction, pending] = useActionState(upsertReminderAction, null);
  const [permission, setPermission] = useState(readNotificationPermission);
  const [timezone, setTimezone] = useState(reminder?.timezone ?? getDefaultTimezone());

  useEffect(() => {
    if (state?.ok) {
      void fetchAndScheduleReminders();
    }
  }, [state]);

  async function handleEnableNotifications() {
    const result = await ensureNotificationPermission();
    setPermission(result);
  }

  const selectedWeekdays = new Set(reminder?.weekdays ?? [1, 3, 5]);

  return (
    <form action={formAction} className="form-compact">
      <input type="hidden" name="reminderType" value={reminderType} />
      <input type="hidden" name="timezone" value={timezone} />

      <div>
        <p className="text-sm font-semibold">{definition.label}</p>
        <p className="text-xs text-[var(--color-muted-foreground)]">{definition.description}</p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={reminder?.enabled ?? false}
          className="h-4 w-4 accent-[var(--color-primary)]"
        />
        {r.enableReminder}
      </label>

      <div>
        <Label>{r.weekdays}</Label>
        <div className="grid grid-cols-7 gap-0.5">
          {WEEKDAY_SHORT_LABELS.map((label, index) => (
            <label
              key={`${label}-${index}`}
              title={r.weekdayNames[index]}
              className="flex min-w-0 flex-col items-center gap-0.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-0.5 py-1 text-[9px] leading-none"
            >
              <input
                type="checkbox"
                name="weekdays"
                value={index}
                defaultChecked={selectedWeekdays.has(index)}
                className="h-3 w-3 shrink-0 accent-[var(--color-primary)]"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="form-grid-2">
        <div>
          <Label htmlFor={`${reminderType}-time`}>{r.time}</Label>
          <Input
            id={`${reminderType}-time`}
            name="reminderTime"
            type="time"
            defaultValue={reminder?.reminderTime ?? "07:30"}
            required
          />
        </div>
        <div>
          <Label htmlFor={`${reminderType}-timezone`}>{r.timezone}</Label>
          <Input
            id={`${reminderType}-timezone`}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            readOnly
          />
        </div>
      </div>

      {permission !== "granted" ? (
        <Button type="button" variant="secondary" size="sm" onClick={handleEnableNotifications}>
          {r.allowNotifications}
        </Button>
      ) : (
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {r.notificationsAllowed}
        </p>
      )}

      {state?.ok === false && state.error ? (
        <p className="text-xs text-[#9a5b45]">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-xs text-[var(--color-primary)]">{r.reminderSaved}</p>
      ) : null}

      <Button type="submit" size="sm" disabled={pending} className="w-full">
        {pending ? t.common.saving : r.saveReminder}
      </Button>
    </form>
  );
}

export function ReminderSettingsForm({
  reminderType,
  reminder,
}: {
  reminderType: "weigh_in";
  reminder: Reminder | null;
}) {
  return (
    <ClientOnly fallback={<div className="min-h-32" aria-busy="true" />}>
      <ReminderSettingsFormInner reminderType={reminderType} reminder={reminder} />
    </ClientOnly>
  );
}
