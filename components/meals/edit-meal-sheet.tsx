"use client";

import { useState, useEffect, useTransition } from "react";
import { Star } from "lucide-react";
import type { MealLogItem } from "@/db/schema";
import { updateMealItemAction } from "@/lib/actions/meals";
import { getFavoriteIdsAction, toggleFavoriteAction } from "@/lib/actions/foods";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { useT } from "@/components/providers/lang-provider";
import { cn } from "@/lib/utils";

interface EditMealSheetProps {
  item: MealLogItem;
  onClose: () => void;
  onSaved: (updated: MealLogItem) => void;
}

export function EditMealSheet({ item, onClose, onSaved }: EditMealSheetProps) {
  const t = useT();
  const m = t.meals;
  const [grams, setGrams] = useState(String(Math.round(item.quantityGrams)));
  const [saving, startSave] = useTransition();
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    if (!item.foodProductId) return;
    getFavoriteIdsAction().then((ids) => setIsFavorited(ids.includes(item.foodProductId!)));
  }, [item.foodProductId]);

  async function handleToggleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    if (!item.foodProductId) return;
    const result = await toggleFavoriteAction(item.foodProductId);
    if (result.ok) setIsFavorited(result.isFavorited);
  }

  const parsed = parseFloat(grams);
  const valid = !isNaN(parsed) && parsed > 0;
  const kcal = valid ? Math.round((item.kcalPer100g * parsed) / 100) : 0;

  function handleSave() {
    if (!valid) return;
    startSave(async () => {
      const result = await updateMealItemAction(item.id, parsed, item.logDate);
      if (result.ok) {
        onSaved({ ...item, quantityGrams: parsed, caloriesKcal: kcal });
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
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{item.productName}</p>
          <div className="flex shrink-0 items-center gap-2">
            {item.foodProductId && (
              <button type="button" onClick={handleToggleFavorite} aria-label={isFavorited ? m.removeFavorite : m.addFavorite}>
                <Star className={cn("h-5 w-5 transition-colors",
                  isFavorited
                    ? "fill-[var(--amber)] text-[var(--amber)]"
                    : "text-[var(--text2)]"
                )} />
              </button>
            )}
            <button type="button" onClick={onClose} className="text-xs text-[var(--text3)]">
              {t.common.cancel}
            </button>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor="meal-grams">{m.quantity}</Label>
            <Input
              id="meal-grams"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="100"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
            />
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card2)] p-3">
            <p className="text-xs text-[var(--color-muted-foreground)]">{m.estimatedCalories}</p>
            <p className="mt-1 text-2xl font-bold">{kcal} <span className="text-sm">kcal</span></p>
          </div>
        </div>
        <Button type="button" disabled={saving || !valid} onClick={handleSave} className="mt-4 w-full">
          {saving ? t.common.saving : t.common.save}
        </Button>
      </div>
    </>
  );
}
