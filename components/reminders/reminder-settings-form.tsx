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
  WEEKDAY_LABELS,
} from "@/lib/reminders/constants";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

export function ReminderSettingsForm({
  reminderType,
  reminder,
}: {
  reminderType: "weigh_in";
  reminder: Reminder | null;
}) {
  const definition = REMINDER_DEFINITIONS[reminderType];
  const [state, formAction, pending] = useActionState(upsertReminderAction, null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const [timezone, setTimezone] = useState(reminder?.timezone ?? getDefaultTimezone());

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

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
    <ClientOnly fallback={<div className="min-h-48" aria-busy="true" />}>
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
        Enable reminder
      </label>

      <div>
        <Label>Weekdays</Label>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label, index) => (
            <label
              key={label}
              className="flex flex-col items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-1 py-1.5 text-[10px]"
            >
              <input
                type="checkbox"
                name="weekdays"
                value={index}
                defaultChecked={selectedWeekdays.has(index)}
                className="h-3.5 w-3.5 accent-[var(--color-primary)]"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="form-grid-2">
        <div>
          <Label htmlFor={`${reminderType}-time`}>Time</Label>
          <Input
            id={`${reminderType}-time`}
            name="reminderTime"
            type="time"
            defaultValue={reminder?.reminderTime ?? "07:30"}
            required
          />
        </div>
        <div>
          <Label htmlFor={`${reminderType}-timezone`}>Timezone</Label>
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
          Allow notifications
        </Button>
      ) : (
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Notifications allowed. Opens {definition.defaultTargetRoute} when tapped.
        </p>
      )}

      {state?.ok === false && state.error ? (
        <p className="text-xs text-[#9a5b45]">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-xs text-[var(--color-primary)]">Reminder settings saved.</p>
      ) : null}

      <Button type="submit" size="sm" disabled={pending} className="w-full">
        {pending ? "Saving..." : "Save reminder"}
      </Button>
    </form>
    </ClientOnly>
  );
}
