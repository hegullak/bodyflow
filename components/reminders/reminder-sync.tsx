"use client";

import { useEffect } from "react";
import {
  fetchAndScheduleReminders,
  registerReminderServiceWorker,
} from "@/lib/reminders/client-scheduler";

export function ReminderSync() {
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      await registerReminderServiceWorker();
      if (cancelled) return;
      await fetchAndScheduleReminders();
    }

    void bootstrap();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void fetchAndScheduleReminders();
      }
    };

    const hourly = window.setInterval(() => {
      void fetchAndScheduleReminders();
    }, 60 * 60 * 1000);

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      clearInterval(hourly);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  return null;
}
