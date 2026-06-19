"use client";

import { useActionState } from "react";
import { ClientOnly } from "@/components/client-only";
import type { UserProfile } from "@/db/schema";
import { upsertProfileAction } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select } from "@/components/ui/field";
import { useT } from "@/components/providers/lang-provider";

export function ProfileForm({ profile }: { profile: UserProfile | null }) {
  const t = useT();
  const p = t.profile;
  const [state, formAction, pending] = useActionState(upsertProfileAction, null);

  return (
    <ClientOnly fallback={<div className="min-h-64" aria-busy="true" />}>
    <form action={formAction} className="form-compact">
      <div className="form-grid-2">
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
          <Label htmlFor="heightCm">{p.height}</Label>
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
          <Label htmlFor="birthYear">{p.birthYear}</Label>
          <Input
            id="birthYear"
            name="birthYear"
            type="number"
            inputMode="numeric"
            placeholder="1976"
            defaultValue={profile?.birthYear ?? ""}
          />
        </div>
        <div />
      </div>

      <div className="form-grid-2">
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
          <Label htmlFor="goal">{p.goal}</Label>
          <Select id="goal" name="goal" defaultValue={profile?.goal ?? "maintenance"}>
            <option value="fat_loss">{p.fatLoss}</option>
            <option value="maintenance">{p.maintenance}</option>
            <option value="muscle_gain">{p.muscleGain}</option>
          </Select>
        </div>
      </div>

      <div className="form-grid-2">
        <div>
          <Label htmlFor="dailyCalorieTarget">{p.dailyKcal}</Label>
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
          <Label htmlFor="targetWeightKg">{p.targetWeight}</Label>
          <Input
            id="targetWeightKg"
            name="targetWeightKg"
            type="number"
            inputMode="decimal"
            step="0.1"
            defaultValue={profile?.targetWeightKg ?? ""}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="preferredUnits">{p.units}</Label>
        <Select
          id="preferredUnits"
          name="preferredUnits"
          defaultValue={profile?.preferredUnits ?? "metric"}
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
