"use client";

import { useState } from "react";
import type { MealLogItem, MealType } from "@/db/schema";
import { removeMealItemAction } from "@/lib/actions/meals";
import { MEAL_LABELS } from "@/lib/meals/constants";
import { ProductPicker } from "@/components/meals/product-picker";
import { Button } from "@/components/ui/button";

export function MealSection({
  logDate,
  mealType,
  items,
  onChanged,
}: {
  logDate: string;
  mealType: MealType;
  items: MealLogItem[];
  onChanged: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.caloriesKcal, 0));

  async function handleRemove(itemId: string) {
    setRemovingId(itemId);
    await removeMealItemAction(itemId, logDate);
    setRemovingId(null);
    onChanged();
  }

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{MEAL_LABELS[mealType]}</h3>
          <p className="text-xs text-[var(--color-muted-foreground)]">{subtotal} kcal</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
          + Legg til
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-[var(--color-muted-foreground)]">Ingen produkter ennå.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-2 rounded-[var(--radius-sm)] bg-[var(--card2)] px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.productName}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {Math.round(item.quantityGrams)} g · {Math.round(item.caloriesKcal)} kcal
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 text-xs text-[var(--color-muted-foreground)] hover:text-[#9a5b45]"
                disabled={removingId === item.id}
                onClick={() => handleRemove(item.id)}
              >
                {removingId === item.id ? "..." : "Fjern"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {pickerOpen ? (
        <ProductPicker
          logDate={logDate}
          mealType={mealType}
          onClose={() => setPickerOpen(false)}
          onAdded={onChanged}
        />
      ) : null}
    </section>
  );
}
