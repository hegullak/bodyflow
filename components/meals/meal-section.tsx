"use client";

import { useRef, useTransition, useState } from "react";
import type { MealLogItem, MealType } from "@/db/schema";
import { removeMealItemAction, copyMealsFromPreviousDateAction } from "@/lib/actions/meals";
import { MEAL_LABELS } from "@/lib/meals/constants";
import { ProductPicker } from "@/components/meals/product-picker";
import { Button } from "@/components/ui/button";
import { addDaysToIsoDate } from "@/lib/utils";

function MealItem({
  item,
  removingId,
  onRemove,
}: {
  item: MealLogItem;
  removingId: string | null;
  onRemove: (id: string) => void;
}) {
  const [swiped, setSwiped] = useState(false);
  const touchStartX = useRef<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    e.stopPropagation();
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(e: React.TouchEvent) {
    e.stopPropagation();
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? null;
    if (endX === null) return;
    const diff = touchStartX.current - endX;
    if (diff > 50) setSwiped(true);
    else if (diff < -30) setSwiped(false);
    touchStartX.current = null;
  }

  return (
    <li
      className="overflow-hidden rounded-[var(--radius-sm)] bg-[var(--card2)]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {swiped ? (
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--color-muted-foreground)] line-through opacity-50">
              {item.productName}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className="text-xs text-[var(--color-muted-foreground)]"
              onClick={() => setSwiped(false)}
            >
              Avbryt
            </button>
            <button
              type="button"
              className="text-xs font-semibold text-[#9a5b45]"
              disabled={removingId === item.id}
              onClick={() => onRemove(item.id)}
            >
              {removingId === item.id ? "Sletter..." : "Slett"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2 px-2 py-1.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.productName}</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {Math.round(item.quantityGrams)} g · {Math.round(item.caloriesKcal)} kcal
            </p>
          </div>
        </div>
      )}
    </li>
  );
}

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
  const [showPrevMealHint, setShowPrevMealHint] = useState(false);
  const [pending, startTransition] = useTransition();
  const sectionTouchStartX = useRef<number | null>(null);
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

  function handleSectionTouchStart(e: React.TouchEvent) {
    sectionTouchStartX.current = e.touches[0]?.clientX ?? null;
  }

  function handleSectionTouchEnd(e: React.TouchEvent) {
    if (sectionTouchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? null;
    if (endX === null) return;
    // left-to-right swipe (endX > startX) on empty section → show previous day hint
    const diff = endX - sectionTouchStartX.current;
    if (diff > 50 && isEmpty && hasPreviousMeals) {
      setShowPrevMealHint(true);
    }
    sectionTouchStartX.current = null;
  }

  return (
    <section
      className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] p-3"
      onTouchStart={handleSectionTouchStart}
      onTouchEnd={handleSectionTouchEnd}
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

      {isEmpty ? (
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
              {hasPreviousMeals
                ? "Sveip høyre for å kopiere fra tidligere."
                : "Ingen produkter ennå."}
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <MealItem
              key={item.id}
              item={item}
              removingId={removingId}
              onRemove={handleRemove}
            />
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
