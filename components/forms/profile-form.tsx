"use client";

import { useActionState, useState } from "react";
import { ClientOnly } from "@/components/client-only";
import type { UserProfile } from "@/db/schema";
import { upsertProfileAction } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select } from "@/components/ui/field";
import { useT } from "@/components/providers/lang-provider";

function currentAge(birthYear: number | null | undefined): string {
  if (!birthYear) return "";
  return String(new Date().getFullYear() - birthYear);
}

export function ProfileForm({ profile }: { profile: UserProfile | null }) {
  const t = useT();
  const p = t.profile;
  const [state, formAction, pending] = useActionState(upsertProfileAction, null);
  const [units, setUnits] = useState<"metric" | "imperial">(profile?.preferredUnits ?? "metric");

  const heightLabel = units === "metric" ? `${p.height} (cm)` : `${p.height} (in)`;
  const weightLabel = units === "metric" ? `${p.weight} (kg)` : `${p.weight} (lbs)`;
  const targetLabel = units === "metric" ? `${p.targetWeight} (kg)` : `${p.targetWeight} (lbs)`;
  const heightPlaceholder = units === "metric" ? "173" : "68";
  const weightPlaceholder = units === "metric" ? "80" : "176";

  return (
    <ClientOnly fallback={<div className="min-h-48" aria-busy="true" />}>
    <form action={formAction} className="form-compact">
      {/* Preserved hidden fields — not shown but saved to DB */}
      <input type="hidden" name="goal" value={profile?.goal ?? "maintenance"} />
      <input type="hidden" name="dailyCalorieTarget" value={profile?.dailyCalorieTarget ?? ""} />
      <input type="hidden" name="birthYear" value={profile?.birthYear ?? ""} />

      {/* Row 1: Sex + Age */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="sex">{p.sex}</Label>
          <Select id="sex" name="sex" defaultValue={profile?.sex ?? ""}>
            <option value="">{p.selectSex}</option>
            <option value="male">{p.male}</option>
            <option value="female">{p.female}</option>
            <option value="other">{p.other}</option>
            <option value="prefer_not_to_say">{p.preferNotToSay}</option>
          </Select>
          <FieldError message={state?.ok === false ? state.fieldErrors?.sex?.[0] : undefined} />
        </div>
        <div>
          <Label htmlFor="age">{p.age}</Label>
          <Input
            id="age"
            name="age"
            type="number"
            inputMode="numeric"
            placeholder="35"
            defaultValue={currentAge(profile?.birthYear)}
          />
        </div>
      </div>

      {/* Row 2: Height + Weight */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="heightCm">{heightLabel}</Label>
          <Input
            id="heightCm"
            name="heightCm"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder={heightPlaceholder}
            defaultValue={profile?.heightCm ?? ""}
          />
          <FieldError message={state?.ok === false ? state.fieldErrors?.heightCm?.[0] : undefined} />
        </div>
        <div>
          <Label htmlFor="weightKg">{weightLabel}</Label>
          <Input
            id="weightKg"
            name="weightKg"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder={weightPlaceholder}
            defaultValue={profile?.weightKg ?? ""}
          />
        </div>
      </div>

      {/* Row 3: Activity level + Target weight */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="activityLevel">{p.activity}</Label>
          <Select
            id="activityLevel"
            name="activityLevel"
            defaultValue={profile?.activityLevel ?? "moderate"}
          >
            <option value="sedentary">{p.sedentary}</option>
            <option value="light">{p.light}</option>
            <option value="moderate">{p.moderate}</option>
            <option value="active">{p.active}</option>
            <option value="very_active">{p.veryActive}</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="targetWeightKg">{targetLabel}</Label>
          <Input
            id="targetWeightKg"
            name="targetWeightKg"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="75"
            defaultValue={profile?.targetWeightKg ?? ""}
          />
        </div>
      </div>

      {/* Row 4: Units */}
      <div>
        <Label htmlFor="preferredUnits">{p.units}</Label>
        <Select
          id="preferredUnits"
          name="preferredUnits"
          value={units}
          onChange={(e) => setUnits(e.target.value as "metric" | "imperial")}
        >
          <option value="metric">{p.metric}</option>
          <option value="imperial">{p.imperial}</option>
        </Select>
      </div>

      {state?.ok === false && !state.fieldErrors ? (
        <p className="text-xs text-[#9a5b45]">{state.error}</p>
      ) : null}
      {state?.ok ? <p className="text-xs text-[var(--color-primary)]">{p.profileSaved}</p> : null}

      <Button type="submit" disabled={pending} size="sm" className="h-9 w-full">
        {pending ? p.saving : p.saveProfile}
      </Button>
    </form>
    </ClientOnly>
  );
}
