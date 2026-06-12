"use client";

import { useActionState } from "react";
import type { BodyMeasurement } from "@/db/schema";
import { upsertMeasurementAction } from "@/lib/actions/measurements";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/field";

export function MeasurementForm({
  measuredOn,
  measurement,
}: {
  measuredOn: string;
  measurement: BodyMeasurement | null;
}) {
  const [state, formAction, pending] = useActionState(upsertMeasurementAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="measuredOn" value={measuredOn} />

      <div>
        <Label htmlFor="waistCm">Waist (cm)</Label>
        <Input
          id="waistCm"
          name="waistCm"
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder="94"
          defaultValue={measurement?.waistCm ?? ""}
        />
        <FieldError message={state?.ok === false ? state.fieldErrors?.waistCm?.[0] : undefined} />
      </div>

      <div>
        <Label htmlFor="chestCm">Chest (cm)</Label>
        <Input
          id="chestCm"
          name="chestCm"
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder="95"
          defaultValue={measurement?.chestCm ?? ""}
        />
      </div>

      <div>
        <Label htmlFor="hipCm">Hip (cm)</Label>
        <Input
          id="hipCm"
          name="hipCm"
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder="96"
          defaultValue={measurement?.hipCm ?? ""}
        />
      </div>

      <div>
        <Label htmlFor="measurementNote">Note (optional)</Label>
        <Textarea id="measurementNote" name="note" defaultValue={measurement?.note ?? ""} />
      </div>

      {state?.ok === false && state.error ? (
        <p className="text-sm text-[#9a5b45]">{state.error}</p>
      ) : null}
      {state?.ok ? <p className="text-sm text-[var(--color-primary)]">Measurements saved.</p> : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving..." : "Save measurements"}
      </Button>
    </form>
  );
}
