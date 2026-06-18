"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { CheckInSnapshot } from "@/lib/queries/check-in";
import { upsertCheckInAction } from "@/lib/actions/check-in";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { formatWeekdayDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

function DiffBadge({ diff }: { diff: number | null | undefined }) {
  if (diff == null || diff === 0) return null;
  const pos = diff > 0;
  return (
    <span
      className={cn(
        "ml-1.5 text-xs font-medium",
        pos ? "text-[#9a5b45]" : "text-[var(--color-primary)]",
      )}
    >
      {pos ? "+" : ""}
      {diff}
    </span>
  );
}

export function CheckInForm({
  logDate,
  today,
  focusWeight = false,
}: {
  logDate: string;
  today: CheckInSnapshot;
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

  const diff = state?.ok ? state.data?.diff : null;

  return (
    <div className="space-y-3" id="weight-section">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="logDate" value={logDate} />

        <p className="text-sm font-medium">{formatWeekdayDate(logDate)}</p>

        <div className="space-y-2">
          {/* Weight — full width */}
          <div>
            <Label htmlFor="weightKg">
              Vekt (kg)
              <DiffBadge diff={diff?.weightKg} />
            </Label>
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

          {/* Body measurements — 3 columns */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="waistCm">
                Midje
                <DiffBadge diff={diff?.waistCm} />
              </Label>
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
              <Label htmlFor="chestCm">
                Bryst
                <DiffBadge diff={diff?.chestCm} />
              </Label>
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
              <Label htmlFor="hipCm">
                Hofte
                <DiffBadge diff={diff?.hipCm} />
              </Label>
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
        </div>

        {state?.ok === false && state.error ? (
          <p className="text-xs text-[#9a5b45]">{state.error}</p>
        ) : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Lagrer..." : "Lagre"}
        </Button>
      </form>
    </div>
  );
}
