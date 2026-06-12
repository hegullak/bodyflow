"use client";

import { useActionState } from "react";
import type { UserProfile } from "@/db/schema";
import { upsertProfileAction } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/field";

export function ProfileForm({ profile }: { profile: UserProfile | null }) {
  const [state, formAction, pending] = useActionState(upsertProfileAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="sex">Sex</Label>
        <Select id="sex" name="sex" defaultValue={profile?.sex ?? ""}>
          <option value="">Select</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </Select>
        <FieldError message={state?.ok === false ? state.fieldErrors?.sex?.[0] : undefined} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="birthYear">Birth year</Label>
          <Input
            id="birthYear"
            name="birthYear"
            type="number"
            inputMode="numeric"
            placeholder="1990"
            defaultValue={profile?.birthYear ?? ""}
          />
          <FieldError message={state?.ok === false ? state.fieldErrors?.birthYear?.[0] : undefined} />
        </div>
        <div>
          <Label htmlFor="birthDate">Birth date (optional)</Label>
          <Input
            id="birthDate"
            name="birthDate"
            type="date"
            defaultValue={profile?.birthDate ?? ""}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="heightCm">Height (cm)</Label>
        <Input
          id="heightCm"
          name="heightCm"
          type="number"
          inputMode="decimal"
          step="0.1"
          required
          defaultValue={profile?.heightCm ?? ""}
        />
        <FieldError message={state?.ok === false ? state.fieldErrors?.heightCm?.[0] : undefined} />
      </div>

      <div>
        <Label htmlFor="activityLevel">Activity level</Label>
        <Select
          id="activityLevel"
          name="activityLevel"
          defaultValue={profile?.activityLevel ?? "moderate"}
        >
          <option value="sedentary">Sedentary</option>
          <option value="light">Light</option>
          <option value="moderate">Moderate</option>
          <option value="active">Active</option>
          <option value="very_active">Very active</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="goal">Goal</Label>
        <Select id="goal" name="goal" defaultValue={profile?.goal ?? "maintenance"}>
          <option value="fat_loss">Fat loss</option>
          <option value="maintenance">Maintenance</option>
          <option value="muscle_gain">Muscle gain</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="targetWeightKg">Target weight (kg, optional)</Label>
        <Input
          id="targetWeightKg"
          name="targetWeightKg"
          type="number"
          inputMode="decimal"
          step="0.1"
          defaultValue={profile?.targetWeightKg ?? ""}
        />
      </div>

      <div>
        <Label htmlFor="preferredUnits">Preferred units</Label>
        <Select
          id="preferredUnits"
          name="preferredUnits"
          defaultValue={profile?.preferredUnits ?? "metric"}
        >
          <option value="metric">Metric</option>
          <option value="imperial">Imperial</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" defaultValue={profile?.notes ?? ""} />
      </div>

      {state?.ok === false && !state.fieldErrors ? (
        <p className="text-sm text-[#9a5b45]">{state.error}</p>
      ) : null}
      {state?.ok ? <p className="text-sm text-[var(--color-primary)]">Profile saved.</p> : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}
