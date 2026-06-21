"use client";

import { useState, useTransition } from "react";
import { Info } from "lucide-react";
import { calcBMR, calcTDEE, adjustedCaloricIntake, ageFromBirthYear } from "@/lib/calculations/bmr";
import { updateDailyCalorieTargetAction } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import type { UserProfile, Goal } from "@/db/schema";

export function CalorieCalculator({ profile }: { profile: UserProfile | null }) {
  const [saving, startSave] = useTransition();
  const [customTarget, setCustomTarget] = useState<string>(profile?.dailyCalorieTarget?.toString() ?? "");

  const age = ageFromBirthYear(profile?.birthYear);
  const bmr = calcBMR(profile?.sex, profile?.weightKg, profile?.heightCm, age);
  const tdee = calcTDEE(bmr, profile?.activityLevel);
  const suggestedTarget = adjustedCaloricIntake(tdee, profile?.goal);

  const displayTarget = customTarget ? parseInt(customTarget) : suggestedTarget;

  function handleSave() {
    const target = customTarget ? parseInt(customTarget) : suggestedTarget;
    if (target && target > 0) {
      startSave(async () => {
        await updateDailyCalorieTargetAction(target);
      });
    }
  }

  if (!profile?.heightCm || !profile?.weightKg || !age) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
        <p className="text-sm text-[var(--text3)]">Fyll inn kjønn, alder, høyde og vekt for å beregne kaloribehov.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
      {/* BMR */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text3)]">BMR</p>
          <span className="group relative">
            <Info className="h-3.5 w-3.5 text-[var(--text3)] cursor-help" />
            <span className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-[var(--card2)] text-[var(--text3)] text-xs rounded px-2 py-1 whitespace-nowrap">
              Hvilekalorienforbruk
            </span>
          </span>
        </div>
        <p className="text-lg font-bold text-[var(--accent)]">{bmr} kcal/dag</p>
        <p className="text-xs text-[var(--text3)]">Hvilekalorienforbruk (Mifflin-St Jeor)</p>
      </div>

      {/* TDEE */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text3)]">TDEE</p>
          <span className="group relative">
            <Info className="h-3.5 w-3.5 text-[var(--text3)] cursor-help" />
            <span className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-[var(--card2)] text-[var(--text3)] text-xs rounded px-2 py-1 whitespace-nowrap">
              Totalt daglig energiforbruk
            </span>
          </span>
        </div>
        <p className="text-lg font-bold text-[var(--accent)]">{tdee} kcal/dag</p>
        <p className="text-xs text-[var(--text3)]">Basert på {profile?.activityLevel === "sedentary" ? "liten" : profile?.activityLevel === "light" ? "lett" : profile?.activityLevel === "moderate" ? "moderat" : profile?.activityLevel === "active" ? "høy" : "veldig høy"} aktivitet</p>
      </div>

      {/* Suggested target */}
      {suggestedTarget && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text3)] mb-1">
            Forslag ({profile?.goal === "fat_loss" ? "−15% for vektreduksjon" : profile?.goal === "muscle_gain" ? "+10% for muskelbygging" : "vedlikehold"})
          </p>
          <p className="text-sm text-[var(--text2)]">{suggestedTarget} kcal/dag</p>
        </div>
      )}

      {/* Custom target */}
      <div>
        <Label htmlFor="dailyCalorieTarget" className="text-xs font-semibold uppercase tracking-widest">
          Ditt daglige mål
        </Label>
        <div className="flex gap-2 mt-1">
          <Input
            id="dailyCalorieTarget"
            type="number"
            inputMode="numeric"
            placeholder={suggestedTarget?.toString() ?? "2000"}
            value={customTarget}
            onChange={(e) => setCustomTarget(e.target.value)}
            className="flex-1 text-sm"
          />
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="h-9 px-3"
          >
            {saving ? "Lagrer..." : "Lagre"}
          </Button>
        </div>
        {displayTarget && (
          <p className="mt-1 text-xs text-[var(--text3)]">
            {displayTarget > (tdee ?? 0) ? `+${displayTarget - (tdee ?? 0)} kcal over TDEE` : displayTarget < (tdee ?? 0) ? `${displayTarget - (tdee ?? 0)} kcal under TDEE` : "= TDEE"}
          </p>
        )}
      </div>
    </div>
  );
}
