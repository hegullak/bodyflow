"use client";

import { useState, useTransition } from "react";
import type { MealType } from "@/db/schema";
import { quickAddMealItemAction } from "@/lib/actions/meals";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { useT } from "@/components/providers/lang-provider";

interface QuickAddSheetProps {
  logDate: string;
  mealType: MealType;
  onClose: () => void;
  onAdded: () => void;
}

export function QuickAddSheet({ logDate, mealType, onClose, onAdded }: QuickAddSheetProps) {
  const t = useT();
  const m = t.meals;
  const [kcal, setKcal] = useState("");
  const [saving, startSave] = useTransition();

  const parsed = parseInt(kcal, 10);
  const valid = !isNaN(parsed) && parsed > 0;

  function handleAdd() {
    if (!valid) return;
    startSave(async () => {
      const result = await quickAddMealItemAction(logDate, mealType, "Manual", parsed);
      if (result.ok) {
        onAdded();
      }
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="fixed bottom-24 left-4 right-4 z-[61] rounded-[var(--radius-lg)] border border-[var(--border)] p-4 shadow-2xl overflow-y-auto"
        style={{
          maxHeight: "calc(100vh - 10rem)",
          backgroundColor: "rgba(20,24,36,0.95)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold">{m.quickAddCalories}</p>
          <button type="button" onClick={onClose} className="text-xs text-[var(--text3)]">
            {t.common.cancel}
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor="quick-kcal">{m.caloriesKcal}</Label>
            <Input
              id="quick-kcal"
              type="number"
              inputMode="numeric"
              placeholder="500"
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
            />
          </div>
        </div>
        <Button type="button" disabled={saving || !valid} onClick={handleAdd} className="mt-4 w-full">
          {saving ? m.addingItem : m.addItem}
        </Button>
      </div>
    </>
  );
}
