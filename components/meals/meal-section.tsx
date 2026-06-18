"use client";

import { useRef, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, Zap } from "lucide-react";
import type { MealLogItem, MealType } from "@/db/schema";
import { removeMealItemAction, updateMealItemAction, copyMealsFromPreviousDateAction, quickAddMealItemAction } from "@/lib/actions/meals";
import { saveMealAction } from "@/lib/actions/saved-meals";
import { MEAL_LABELS } from "@/lib/meals/constants";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { addDaysToIsoDate } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Swipeable meal item — tap to edit, swipe left to delete
// ---------------------------------------------------------------------------

const REVEAL_W = 112; // width of edit + delete buttons
const SNAP = 40;      // snap threshold

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
  const innerRef = useRef<HTMLDivElement>(null);
  const sw = useRef({ startX: 0, startY: 0, tracking: false, revealed: false, dragging: false });
  const [deleting, startDelete] = useTransition();

  function snap(x: number, animate = true) {
    const el = innerRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 0.25s cubic-bezier(0.4,0,0.2,1)" : "none";
    el.style.transform = `translateX(${x}px)`;
    sw.current.revealed = x < 0;
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    sw.current = { startX: e.clientX, startY: e.clientY, tracking: true, dragging: false, revealed: sw.current.revealed };
    if (innerRef.current) innerRef.current.style.transition = "none";
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!sw.current.tracking || !innerRef.current) return;
    const dx = e.clientX - sw.current.startX;
    const dy = e.clientY - sw.current.startY;
    if (!sw.current.dragging && Math.abs(dy) > Math.abs(dx) + 5) { sw.current.tracking = false; return; }
    if (!sw.current.dragging && Math.abs(dx) > 4) sw.current.dragging = true;
    if (!sw.current.dragging) return;
    const base = sw.current.revealed ? -REVEAL_W : 0;
    const x = Math.max(-REVEAL_W, Math.min(0, base + dx));
    innerRef.current.style.transform = `translateX(${x}px)`;
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!sw.current.tracking) return;
    sw.current.tracking = false;
    if (!sw.current.dragging) return;
    const dx = e.clientX - sw.current.startX;
    const base = sw.current.revealed ? -REVEAL_W : 0;
    snap(base + dx < -SNAP ? -REVEAL_W : 0);
  }

  function handleEdit() {
    snap(0);
    setTimeout(() => onEdit(item), 200);
  }

  function handleDelete() {
    snap(0);
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
          aria-label="Rediger"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex w-14 items-center justify-center bg-[var(--red)] text-white active:opacity-80 disabled:opacity-50"
          aria-label="Slett"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={innerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { sw.current.tracking = false; snap(sw.current.revealed ? -REVEAL_W : 0); }}
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
// Edit meal sheet (bottomsheet)
// ---------------------------------------------------------------------------

function EditMealSheet({
  item,
  onClose,
  onSaved,
}: {
  item: MealLogItem;
  onClose: () => void;
  onSaved: (updated: MealLogItem) => void;
}) {
  const [grams, setGrams] = useState(String(Math.round(item.quantityGrams)));
  const [saving, startSave] = useTransition();

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
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold">{item.productName}</p>
          <button type="button" onClick={onClose} className="text-xs text-[var(--text3)]">
            Avbryt
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor="meal-grams">Mengde (g)</Label>
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
            <p className="text-xs text-[var(--color-muted-foreground)]">Estimert kalorier</p>
            <p className="mt-1 text-2xl font-bold">{kcal} <span className="text-sm">kcal</span></p>
          </div>
        </div>
        <Button type="button" disabled={saving || !valid} onClick={handleSave} className="mt-4 w-full">
          {saving ? "Lagrer…" : "Lagre"}
        </Button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Quick add sheet (kalorier only)
// ---------------------------------------------------------------------------

function QuickAddSheet({
  logDate,
  mealType,
  onClose,
  onAdded,
}: {
  logDate: string;
  mealType: MealType;
  onClose: () => void;
  onAdded: () => void;
}) {
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
          <p className="text-sm font-semibold">Legg til kalorier</p>
          <button type="button" onClick={onClose} className="text-xs text-[var(--text3)]">
            Avbryt
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor="quick-kcal">Kalorier (kcal)</Label>
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
          {saving ? "Legger til…" : "Legg til"}
        </Button>
      </div>
    </>
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
  const copyLabel = previousDayMeals.length > 0 ? "Kopier fra i går" : "Kopier fra i forgårs";
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
          <h3 className="text-base font-bold">{MEAL_LABELS[mealType]}</h3>
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">{subtotal} kcal</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowQuickAdd(true)}
            title="Quick add kalorier"
          >
            <Zap className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/meals/add?date=${logDate}&type=${mealType}`)}
            title="Legg til måltid"
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
              + Legg til som eget måltid
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
