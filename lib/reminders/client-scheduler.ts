"use client";

import { markReminderTriggeredAction } from "@/lib/actions/reminders";
import { getUpcomingReminderTimes } from "@/lib/reminders/schedule";

export type ClientReminder = {
  id: string;
  reminderType: string;
  enabled: boolean;
  weekdays: number[];
  reminderTime: string;
  timezone: string;
  targetRoute: string;
  notificationTitle: string;
  notificationBody: string;
};

const scheduledTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function clearScheduled() {
  for (const timeout of scheduledTimeouts.values()) {
    clearTimeout(timeout);
  }
  scheduledTimeouts.clear();
}

async function showReminderNotification(reminder: ClientReminder, fireAt: Date) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const reg = await navigator.serviceWorker?.getRegistration();
  const payload = {
    title: reminder.notificationTitle,
    body: reminder.notificationBody,
    url: reminder.targetRoute,
    reminderId: reminder.id,
    fireAt: fireAt.toISOString(),
  };

  if (reg?.showNotification) {
    await reg.showNotification(payload.title, {
      body: payload.body,
      data: payload,
      tag: `${reminder.reminderType}-${fireAt.toISOString()}`,
    });
  } else {
    new Notification(payload.title, { body: payload.body, data: payload });
  }

  await markReminderTriggeredAction(reminder.id);
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export async function registerReminderServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function syncReminderNotifications(reminders: ClientReminder[]) {
  clearScheduled();

  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const now = new Date();
  for (const reminder of reminders) {
    if (!reminder.enabled) continue;

    const upcoming = getUpcomingReminderTimes(
      {
        weekdays: reminder.weekdays,
        reminderTime: reminder.reminderTime,
        timezone: reminder.timezone,
      },
      now,
      8,
    );

    for (const fireAt of upcoming) {
      const delay = fireAt.getTime() - now.getTime();
      if (delay <= 0 || delay > 7 * 24 * 60 * 60 * 1000) continue;

      const key = `${reminder.id}:${fireAt.toISOString()}`;
      const timeout = setTimeout(() => {
        void showReminderNotification(reminder, fireAt);
        scheduledTimeouts.delete(key);
      }, delay);
      scheduledTimeouts.set(key, timeout);
    }
  }
}

export async function fetchAndScheduleReminders() {
  const res = await fetch("/api/reminders", { cache: "no-store" });
  if (!res.ok) return;
  const json = (await res.json()) as { data: ClientReminder[] };
  await syncReminderNotifications(json.data ?? []);
}
