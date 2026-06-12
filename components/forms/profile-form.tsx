"use client";

import { useActionState } from "react";
import { ClientOnly } from "@/components/client-only";
import type { UserProfile } from "@/db/schema";
import { upsertProfileAction } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select } from "@/components/ui/field";

export function ProfileForm({ profile }: { profile: UserProfile | null }) {
  const [state, formAction, pending] = useActionState(upsertProfileAction, null);

  return (
    <ClientOnly fallback={<div className="min-h-64" aria-busy="true" />}>
    <form action={formAction} className="form-compact">
      <div className="form-grid-2">
        <div>
          <Label htmlFor="sex">Sex</Label>
          <Select id="sex" name="sex" defaultValue={profile?.sex ?? ""}>
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not</option>
          </Select>
          <FieldError message={state?.ok === false ? state.fieldErrors?.sex?.[0] : undefined} />
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
      </div>

      <div className="form-grid-2">
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
        </div>
        <div>
          <Label htmlFor="birthDate">Birth date</Label>
          <Input
            id="birthDate"
            name="birthDate"
            type="date"
            defaultValue={profile?.birthDate ?? ""}
          />
        </div>
      </div>

      <div className="form-grid-2">
        <div>
          <Label htmlFor="activityLevel">Activity</Label>
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
      </div>

      <div className="form-grid-2">
        <div>
          <Label htmlFor="dailyCalorieTarget">Daily kcal</Label>
          <Input
            id="dailyCalorieTarget"
            name="dailyCalorieTarget"
            type="number"
            inputMode="numeric"
            placeholder="2100"
            defaultValue={profile?.dailyCalorieTarget ?? ""}
          />
          <FieldError
            message={
              state?.ok === false ? state.fieldErrors?.dailyCalorieTarget?.[0] : undefined
            }
          />
        </div>
        <div>
          <Label htmlFor="targetWeightKg">Target (kg)</Label>
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
          <Label htmlFor="preferredUnits">Units</Label>
          <Select
            id="preferredUnits"
            name="preferredUnits"
            defaultValue={profile?.preferredUnits ?? "metric"}
          >
            <option value="metric">Metric</option>
            <option value="imperial">Imperial</option>
          </Select>
        </div>
      </div>

      {state?.ok === false && !state.fieldErrors ? (
        <p className="text-xs text-[#9a5b45]">{state.error}</p>
      ) : null}
      {state?.ok ? <p className="text-xs text-[var(--color-primary)]">Profile saved.</p> : null}

      <Button type="submit" disabled={pending} size="sm" className="h-9 w-full">
        {pending ? "Saving..." : "Save profile"}
      </Button>
    </form>
    </ClientOnly>
  );
}
