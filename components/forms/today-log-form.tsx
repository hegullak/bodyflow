"use client";

import { useActionState, useEffect, useRef } from "react";
import type { DailyBodyLog } from "@/db/schema";
import { upsertDailyLogAction } from "@/lib/actions/daily-log";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/field";

export function TodayLogForm({
  logDate,
  todayLog,
  calorieTarget,
  focusWeight = false,
}: {
  logDate: string;
  todayLog: DailyBodyLog | null;
  calorieTarget?: number | null;
  focusWeight?: boolean;
}) {
  const [state, formAction, pending] = useActionState(upsertDailyLogAction, null);
  const weightRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focusWeight) return;
    document.getElementById("weight-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    weightRef.current?.focus();
  }, [focusWeight]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="logDate" value={logDate} />

      <div>
        <Label htmlFor="weightKg">Weight (kg)</Label>
        <Input
          ref={weightRef}
          id="weightKg"
          name="weightKg"
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder="78.4"
          defaultValue={todayLog?.weightKg ?? ""}
        />
        <FieldError message={state?.ok === false ? state.fieldErrors?.weightKg?.[0] : undefined} />
      </div>

      <div>
        <Label htmlFor="calorieIntake">Calories today</Label>
        <Input
          id="calorieIntake"
          name="calorieIntake"
          type="number"
          inputMode="numeric"
          placeholder={calorieTarget != null ? String(calorieTarget) : "2100"}
          defaultValue={todayLog?.calorieIntake ?? ""}
        />
        <FieldError
          message={state?.ok === false ? state.fieldErrors?.calorieIntake?.[0] : undefined}
        />
      </div>

      <div>
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea id="note" name="note" defaultValue={todayLog?.note ?? ""} />
      </div>

      {state?.ok === false && state.error ? (
        <p className="text-sm text-[#9a5b45]">{state.error}</p>
      ) : null}
      {state?.ok ? <p className="text-sm text-[var(--color-primary)]">Today&apos;s log saved.</p> : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving..." : "Save today"}
      </Button>
    </form>
  );
}
