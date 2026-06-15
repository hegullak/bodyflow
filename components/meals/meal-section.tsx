"use client";

import { useTransition, useState } from "react";
import type { MealLogItem, MealType } from "@/db/schema";
import { removeMealItemAction, copyMealsFromPreviousDateAction } from "@/lib/actions/meals";
import { MEAL_LABELS } from "@/lib/meals/constants";
import { ProductPicker } from "@/components/meals/product-picker";
import { Button } from "@/components/ui/button";
import { addDaysToIsoDate } from "@/lib/utils";

export function MealSection({
  logDate,
  mealType,
  items,
  previousDayItems,
  twoDaysAgoItems,
  onChanged,
}: {
  logDate: string;
  mealType: MealType;
  items: MealLogItem[];
  previousDayItems: MealLogItem[];
  twoDaysAgoItems: MealLogItem[];
  onChanged: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [swipeStart, setSwipeStart] = useState<number | null>(null);
  const [showPrevMealHint, setShowPrevMealHint] = useState(false);
  const [pending, startTransition] = useTransition();
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.caloriesKcal, 0));

  const isEmpty = items.length === 0;
  const previousDayMeals = previousDayItems.filter((item) => item.mealType === mealType);
  const twoDaysAgoMeals = twoDaysAgoItems.filter((item) => item.mealType === mealType);
  const hasPreviousMeals = previousDayMeals.length > 0 || twoDaysAgoMeals.length > 0;

  async function handleRemove(itemId: string) {
    setRemovingId(itemId);
    await removeMealItemAction(itemId, logDate);
    setRemovingId(null);
    onChanged();
  }

  function handleCopyFromPreviousDay(sourceDate: string) {
    const formData = new FormData();
    formData.set("logDate", logDate);
    formData.set("mealType", mealType);
    formData.set("sourceDate", sourceDate);

    startTransition(async () => {
      const result = await copyMealsFromPreviousDateAction(null, formData);
      if (result.ok) {
        setShowPrevMealHint(false);
        onChanged();
      }
    });
  }

  function handleTouchStart(e: React.TouchEvent) {
    setSwipeStart(e.touches[0]?.clientX ?? null);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (swipeStart === null) return;
    const swipeEnd = e.changedTouches[0]?.clientX ?? null;
    if (swipeEnd === null) return;

    const diff = swipeStart - swipeEnd;
    if (diff > 50 && isEmpty && hasPreviousMeals) {
      setShowPrevMealHint(true);
    }

    setSwipeStart(null);
  }

  return (
    <section
      className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] p-3"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
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
        <div className="space-y-2">
          {showPrevMealHint && hasPreviousMeals ? (
            <div className="space-y-2">
              {previousDayMeals.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={pending}
                  onClick={() => handleCopyFromPreviousDay(addDaysToIsoDate(logDate, -1))}
                >
                  {pending ? "..." : "Legg til matvarer fra i går"}
                </Button>
              ) : null}
              {twoDaysAgoMeals.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={pending}
                  onClick={() => handleCopyFromPreviousDay(addDaysToIsoDate(logDate, -2))}
                >
                  {pending ? "..." : "Legg til matvarer fra i forgårs"}
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {hasPreviousMeals ? "Sveip fra venstre for å legge til fra tidligere." : "Ingen produkter ennå."}
            </p>
          )}
        </div>
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
