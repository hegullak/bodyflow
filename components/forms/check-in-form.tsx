"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { CheckInDiff, CheckInSnapshot } from "@/lib/queries/check-in";
import { upsertCheckInAction } from "@/lib/actions/check-in";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { formatWeekdayDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

function formatValue(value: number | null, kind: "kg" | "cm"): string {
  if (value == null) return "—";
  return kind === "kg" ? `${value} kg` : `${value} cm`;
}

function snapshotLine(row: CheckInSnapshot): string {
  return `${formatWeekdayDate(row.logDate)} — ${formatValue(row.weightKg, "kg")} — ${formatValue(row.waistCm, "cm")} — ${formatValue(row.chestCm, "cm")} — ${formatValue(row.hipCm, "cm")}`;
}

function diffPart(
  label: string,
  value: number | null,
  unit: string,
): { text: string; tone: "up" | "down" | "neutral" } | null {
  if (value == null || value === 0) return null;
  const sign = value > 0 ? "+" : "";
  return {
    text: `${label} ${sign}${value}${unit}`,
    tone: value > 0 ? "up" : "down",
  };
}

function DiffLine({ diff }: { diff: CheckInDiff }) {
  const parts = [
    diffPart("Vekt", diff.weightKg, "kg"),
    diffPart("Midje", diff.waistCm, "cm"),
    diffPart("Bryst", diff.chestCm, "cm"),
    diffPart("Hofte", diff.hipCm, "cm"),
  ].filter(Boolean) as Array<{ text: string; tone: "up" | "down" | "neutral" }>;

  if (parts.length === 0) return null;

  return (
    <p className="text-xs leading-relaxed">
      {parts.map((part, index) => (
        <span key={part.text}>
          {index > 0 ? " · " : null}
          <span
            className={cn(
              part.tone === "up" && "text-[#9a5b45]",
              part.tone === "down" && "text-[var(--color-primary)]",
            )}
          >
            {part.text}
          </span>
        </span>
      ))}
    </p>
  );
}

export function CheckInForm({
  logDate,
  today,
  recent,
  focusWeight = false,
}: {
  logDate: string;
  today: CheckInSnapshot;
  recent: CheckInSnapshot[];
  focusWeight?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(upsertCheckInAction, null);
  const weightRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focusWeight) return;
    weightRef.current?.focus();
  }, [focusWeight]);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <div className="space-y-3" id="weight-section">
      {recent.length > 0 ? (
        <div className="space-y-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-muted)]/40 px-2.5 py-2">
          {recent.map((row) => (
            <p
              key={row.logDate}
              className="text-[11px] leading-snug text-[var(--color-muted-foreground)]"
            >
              {snapshotLine(row)}
            </p>
          ))}
        </div>
      ) : null}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="logDate" value={logDate} />

        <p className="text-sm font-medium">{formatWeekdayDate(logDate)}</p>

        <div className="form-grid-2">
          <div>
            <Label htmlFor="weightKg">Vekt (kg)</Label>
            <Input
              ref={weightRef}
              id="weightKg"
              name="weightKg"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="78.4"
              defaultValue={today.weightKg ?? ""}
            />
            <FieldError message={state?.ok === false ? state.fieldErrors?.weightKg?.[0] : undefined} />
          </div>
          <div>
            <Label htmlFor="waistCm">Midje (cm)</Label>
            <Input
              id="waistCm"
              name="waistCm"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="94"
              defaultValue={today.waistCm ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="chestCm">Bryst (cm)</Label>
            <Input
              id="chestCm"
              name="chestCm"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="95"
              defaultValue={today.chestCm ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="hipCm">Hofte (cm)</Label>
            <Input
              id="hipCm"
              name="hipCm"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="96"
              defaultValue={today.hipCm ?? ""}
            />
          </div>
        </div>

        {state?.ok === false && state.error ? (
          <p className="text-xs text-[#9a5b45]">{state.error}</p>
        ) : null}

        {state?.ok && state.data?.diff ? <DiffLine diff={state.data.diff} /> : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Lagrer..." : "Save"}
        </Button>
      </form>
    </div>
  );
}
