"use client";

import { useRef, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { MealLogItem, MealType } from "@/db/schema";
import { removeMealItemAction, copyMealsFromPreviousDateAction } from "@/lib/actions/meals";
import { saveMealAction } from "@/lib/actions/saved-meals";
import { MEAL_LABELS } from "@/lib/meals/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { addDaysToIsoDate } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Swipeable meal item — pointer events + translateX
// ---------------------------------------------------------------------------

const DELETE_W = 72;

function SwipeableMealItem({
  item,
  removingId,
  onRemove,
}: {
  item: MealLogItem;
  removingId: string | null;
  onRemove: (id: string) => void;
}) {
  const [offset, setOffset] = useState(0);
  const [settled, setSettled] = useState(true);
  const startRef = useRef({ x: 0, y: 0, active: false, locked: false, startOffset: 0 });

  function onPointerDown(e: React.PointerEvent) {
    startRef.current = { x: e.clientX, y: e.clientY, active: true, locked: false, startOffset: offset };
    setSettled(false);
  }

  function onPointerMove(e: React.PointerEvent) {
    const s = startRef.current;
    if (!s.active || s.locked) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dy) > Math.abs(dx) + 6) { s.locked = true; setSettled(true); return; }
    if (Math.abs(dx) < 4) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setOffset(Math.min(0, Math.max(s.startOffset + dx, -DELETE_W)));
  }

  function onPointerUp() {
    startRef.current.active = false;
    setSettled(true);
    setOffset((prev) => (prev < -(DELETE_W * 0.45) ? -DELETE_W : 0));
  }

  function handleDelete() {
    setOffset(-DELETE_W * 4);
    setTimeout(() => onRemove(item.id), 180);
  }

  return (
    <li className="relative overflow-hidden">
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-[var(--red)]"
        style={{ width: DELETE_W }}
      >
        <button
          type="button"
          onClick={handleDelete}
          disabled={removingId === item.id}
          className="flex h-full w-full items-center justify-center"
          aria-label="Slett"
        >
          <Trash2 className="h-4 w-4 text-white" />
        </button>
      </div>
      <div
        className="relative flex items-center gap-2 py-1.5 touch-pan-y"
        style={{
          transform: `translateX(${offset}px)`,
          transition: settled ? "transform 0.22s ease" : "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.productName}</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {Math.round(item.caloriesKcal)} kcal
            {item.foodProductId || item.quantityGrams !== 100
              ? ` · ${Math.round(item.quantityGrams)} g`
              : null}
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
  const [name, setName] = useState("");
  return (
    <div className="mt-2 flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Navn på måltid…"
        className="flex-1 text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) onSave(name);
          if (e.key === "Escape") onCancel();
        }}
      />
      <Button type="button" size="sm" disabled={saving || !name.trim()} onClick={() => onSave(name)}>
        {saving ? "..." : "Lagre"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        Avbryt
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
  const router = useRouter();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [copyPending, startCopyTransition] = useTransition();
  const [savePending, startSaveTransition] = useTransition();

  const sectionSwipe = useRef({ x: 0, active: false });
  const [copyOffset, setCopyOffset] = useState(0);
  const [copySettled, setCopySettled] = useState(true);
  const [showCopyButtons, setShowCopyButtons] = useState(false);

  const subtotal = Math.round(items.reduce((sum, i) => sum + i.caloriesKcal, 0));
  const isEmpty = items.length === 0;
  const previousDayMeals = previousDayItems.filter((i) => i.mealType === mealType);
  const twoDaysAgoMeals = twoDaysAgoItems.filter((i) => i.mealType === mealType);
  const hasPreviousMeals = previousDayMeals.length > 0 || twoDaysAgoMeals.length > 0;

  async function handleRemove(itemId: string) {
    setRemovingId(itemId);
    await removeMealItemAction(itemId, logDate);
    setRemovingId(null);
    onChanged();
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
    startSaveTransition(async () => {
      await saveMealAction(logDate, mealType, name);
      setShowSaveForm(false);
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
      <div className="mb-1 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{MEAL_LABELS[mealType]}</h3>
          <p className="text-xs text-[var(--color-muted-foreground)]">{subtotal} kcal</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/meals/add?date=${logDate}&type=${mealType}`)}
        >
          + Legg til
        </Button>
      </div>

      {isEmpty ? (
        <div className="relative overflow-hidden">
          {hasPreviousMeals && (
            <div className="absolute inset-y-0 left-0 flex flex-col justify-center gap-1" style={{ width: COPY_SNAP }}>
              {previousDayMeals.length > 0 && (
                <button type="button" disabled={copyPending}
                  onClick={() => handleCopyFromDay(addDaysToIsoDate(logDate, -1))}
                  className="text-left text-xs font-medium text-[var(--color-primary)]">
                  {copyPending ? "..." : "Kopier fra i går"}
                </button>
              )}
              {twoDaysAgoMeals.length > 0 && (
                <button type="button" disabled={copyPending}
                  onClick={() => handleCopyFromDay(addDaysToIsoDate(logDate, -2))}
                  className="text-left text-xs font-medium text-[var(--color-primary)]">
                  {copyPending ? "..." : "Kopier fra i forgårs"}
                </button>
              )}
            </div>
          )}
          <div
            style={{
              transform: `translateX(${copyOffset}px)`,
              transition: copySettled ? "transform 0.22s ease" : "none",
            }}
            onPointerDown={onSectionPointerDown}
            onPointerMove={onSectionPointerMove}
            onPointerUp={onSectionPointerUp}
            onPointerCancel={onSectionPointerUp}
          >
            {showCopyButtons ? (
              <button type="button" className="text-xs text-[var(--color-muted-foreground)]"
                onClick={() => { setShowCopyButtons(false); setCopyOffset(0); }}>
                Lukk
              </button>
            ) : (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {hasPreviousMeals ? "Sveip høyre for å kopiere fra tidligere." : "Ingen produkter ennå."}
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-[var(--color-border)]">
            {items.map((item) => (
              <SwipeableMealItem
                key={item.id}
                item={item}
                removingId={removingId}
                onRemove={handleRemove}
              />
            ))}
          </ul>
          {showSaveForm ? (
            <SaveMealForm onSave={handleSaveMeal} onCancel={() => setShowSaveForm(false)} saving={savePending} />
          ) : (
            <button type="button" onClick={() => setShowSaveForm(true)}
              className="mt-2 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]">
              + Legg til som eget måltid
            </button>
          )}
        </>
      )}
    </section>
  );
}
