"use client";

import { useRef, useTransition, useState } from "react";
import { useSwipeReveal } from "@/hooks/use-swipe-reveal";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, Zap } from "lucide-react";
import type { MealLogItem, MealType } from "@/db/schema";
import { removeMealItemAction, copyMealsFromPreviousDateAction } from "@/lib/actions/meals";
import { saveMealAction } from "@/lib/actions/saved-meals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { addDaysToIsoDate } from "@/lib/utils";
import { useT } from "@/components/providers/lang-provider";
import { EditMealSheet } from "./edit-meal-sheet";
import { QuickAddSheet } from "./quick-add-sheet";

// ---------------------------------------------------------------------------
// Swipeable meal item — tap to edit, swipe left to delete
// ---------------------------------------------------------------------------

const REVEAL_W = 112;

function SwipeableMealItem({
  item,
  logDate,
  removingId,
  onRemove,
  onEdit,
}: {
  item: MealLogItem;
  logDate: string;
  removingId: string | null;
  onRemove: (id: string) => void;
  onEdit: (item: MealLogItem) => void;
}) {
  const t = useT();
  const { innerRef, snapTo, handlers } = useSwipeReveal();
  const [deleting, startDelete] = useTransition();

  function handleEdit() {
    snapTo(0);
    setTimeout(() => onEdit(item), 200);
  }

  function handleDelete() {
    snapTo(0);
    startDelete(async () => {
      await removeMealItemAction(item.id, logDate);
      onRemove(item.id);
    });
  }

  const showGrams = Boolean(item.foodProductId) || item.quantityGrams !== 100;

  return (
    <li className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex" style={{ width: REVEAL_W }}>
        <button
          type="button"
          onClick={handleEdit}
          className="flex w-14 items-center justify-center bg-blue-500 text-white active:opacity-80"
          aria-label={t.common.edit}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex w-14 items-center justify-center bg-[var(--red)] text-white active:opacity-80 disabled:opacity-50"
          aria-label={t.common.delete}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={innerRef}
        {...handlers}
        className="relative flex items-center gap-2 py-1.5 bg-[var(--card)]"
        style={{
          touchAction: "pan-y",
          userSelect: "none",
          willChange: "transform",
          opacity: removingId === item.id ? 0.4 : 1,
        }}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.productName}</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {Math.round(item.caloriesKcal)} kcal
            {showGrams ? ` · ${Math.round(item.quantityGrams)} g` : null}
          </p>
        </div>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Save-as-meal inline form
// ---------------------------------------------------------------------------

function SaveMealForm({ onSave, onCancel, saving }: {
  onSave: (name: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const t = useT();
  const m = t.meals;
  const [name, setName] = useState("");
  return (
    <div className="mt-2 flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={m.mealNamePlaceholder}
        className="flex-1 text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) onSave(name);
          if (e.key === "Escape") onCancel();
        }}
      />
      <Button type="button" size="sm" disabled={saving || !name.trim()} onClick={() => onSave(name)}>
        {saving ? "..." : t.common.save}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        {t.common.cancel}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MealSection
// ---------------------------------------------------------------------------

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
  const t = useT();
  const m = t.meals;
  const router = useRouter();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MealLogItem | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copyPending, startCopyTransition] = useTransition();
  const [savePending, startSaveTransition] = useTransition();
  const [, startRemoveTransition] = useTransition();

  const sectionSwipe = useRef({ x: 0, active: false });
  const [copyOffset, setCopyOffset] = useState(0);
  const [copySettled, setCopySettled] = useState(true);
  const [showCopyButtons, setShowCopyButtons] = useState(false);

  const subtotal = Math.round(items.reduce((sum, i) => sum + i.caloriesKcal, 0));
  const isEmpty = items.length === 0;
  const previousDayMeals = previousDayItems.filter((i) => i.mealType === mealType);
  const twoDaysAgoMeals = twoDaysAgoItems.filter((i) => i.mealType === mealType);
  const copySourceDate = previousDayMeals.length > 0
    ? addDaysToIsoDate(logDate, -1)
    : twoDaysAgoMeals.length > 0
      ? addDaysToIsoDate(logDate, -2)
      : null;
  const copyLabel = previousDayMeals.length > 0 ? m.copyFromYesterday : m.copyFromTwoDaysAgo;
  const hasPreviousMeals = copySourceDate !== null;

  function handleRemove(itemId: string) {
    setRemovingId(itemId);
    startRemoveTransition(async () => {
      try {
        await removeMealItemAction(itemId, logDate);
        onChanged();
      } finally {
        setRemovingId(null);
      }
    });
  }

  function handleCopyFromDay(sourceDate: string) {
    const fd = new FormData();
    fd.set("logDate", logDate);
    fd.set("mealType", mealType);
    fd.set("sourceDate", sourceDate);
    startCopyTransition(async () => {
      const result = await copyMealsFromPreviousDateAction(null, fd);
      if (result.ok) { setShowCopyButtons(false); setCopyOffset(0); onChanged(); }
    });
  }

  function handleSaveMeal(name: string) {
    setSaveError(null);
    startSaveTransition(async () => {
      const result = await saveMealAction(logDate, mealType, name);
      if (result.ok) setShowSaveForm(false);
      else setSaveError(result.error ?? "Lagring feilet.");
    });
  }

  const COPY_SNAP = 140;

  function onSectionPointerDown(e: React.PointerEvent) {
    if (!isEmpty || !hasPreviousMeals || showCopyButtons) return;
    sectionSwipe.current = { x: e.clientX, active: true };
    setCopySettled(false);
  }

  function onSectionPointerMove(e: React.PointerEvent) {
    if (!sectionSwipe.current.active) return;
    const dx = e.clientX - sectionSwipe.current.x;
    if (dx < 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setCopyOffset(Math.min(dx, COPY_SNAP + 20));
  }

  function onSectionPointerUp() {
    if (!sectionSwipe.current.active) return;
    sectionSwipe.current.active = false;
    setCopySettled(true);
    if (copyOffset > COPY_SNAP * 0.5) {
      setCopyOffset(COPY_SNAP);
      setShowCopyButtons(true);
    } else {
      setCopyOffset(0);
    }
  }

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold">{t.meals.mealLabel(mealType)}</h3>
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">{subtotal} kcal</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowQuickAdd(true)}
            title={m.quickAddCalories}
          >
            <Zap className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/meals/add?date=${logDate}&type=${mealType}`)}
            title={m.addToMeal}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <hr className="my-2 border-t border-[var(--border)]" />

      {isEmpty ? (
        <div className="relative overflow-hidden">
          {hasPreviousMeals && (
            <div className="absolute inset-y-0 left-0 flex items-center" style={{ width: COPY_SNAP }}>
              <button type="button" disabled={copyPending}
                onClick={() => handleCopyFromDay(copySourceDate!)}
                className="text-left text-xs font-medium text-[var(--color-primary)]">
                {copyPending ? "..." : copyLabel}
              </button>
            </div>
          )}
          <div
            className="bg-[var(--card)]"
            style={{
              transform: `translateX(${copyOffset}px)`,
              transition: copySettled ? "transform 0.22s ease" : "none",
              touchAction: "pan-y",
            }}
            onPointerDown={onSectionPointerDown}
            onPointerMove={onSectionPointerMove}
            onPointerUp={onSectionPointerUp}
            onPointerCancel={onSectionPointerUp}
          >
            {showCopyButtons ? (
              <button type="button" className="text-xs text-[var(--color-muted-foreground)]"
                onClick={() => { setShowCopyButtons(false); setCopyOffset(0); }}>
                {t.common.close}
              </button>
            ) : (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {hasPreviousMeals ? m.swipeRightToCopy : m.noProductsYet}
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <ul>
            {items.map((item) => (
              <SwipeableMealItem
                key={item.id}
                item={item}
                logDate={logDate}
                removingId={removingId}
                onRemove={handleRemove}
                onEdit={setEditingItem}
              />
            ))}
          </ul>
          {showSaveForm ? (
            <>
              <SaveMealForm onSave={handleSaveMeal} onCancel={() => { setShowSaveForm(false); setSaveError(null); }} saving={savePending} />
              {saveError && <p className="mt-1 text-xs text-[var(--red)]">{saveError}</p>}
            </>
          ) : (
            <button type="button" onClick={() => setShowSaveForm(true)}
              className="mt-2 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]">
              {m.saveAsMeal}
            </button>
          )}
        </>
      )}

      {showQuickAdd && (
        <QuickAddSheet
          logDate={logDate}
          mealType={mealType}
          onClose={() => setShowQuickAdd(false)}
          onAdded={() => {
            setShowQuickAdd(false);
            onChanged();
          }}
        />
      )}

      {editingItem && (
        <EditMealSheet
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            onChanged();
            setEditingItem(null);
          }}
        />
      )}
    </section>
  );
}
