"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { MealLogItem } from "@/db/schema";
import { updateMealItemAction, removeMealItemAction } from "@/lib/actions/meals";
import { Button } from "@/components/ui/button";
import { MEAL_LABELS } from "@/lib/meals/constants";

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
  });
}

export function MealItemDetail({ item }: { item: MealLogItem }) {
  const router = useRouter();
  const [grams, setGrams] = useState(String(Math.round(item.quantityGrams)));
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();

  const parsed = parseFloat(grams);
  const valid = !isNaN(parsed) && parsed > 0;
  const kcal = valid ? Math.round((item.kcalPer100g * parsed) / 100) : 0;

  function handleSave() {
    if (!valid) return;
    setError(null);
    startSave(async () => {
      const result = await updateMealItemAction(item.id, parsed, item.logDate);
      if (result.ok) {
        router.push(`/meals?date=${item.logDate}`);
      } else {
        setError(result.error ?? "Noe gikk galt.");
      }
    });
  }

  function handleDelete() {
    startDelete(async () => {
      await removeMealItemAction(item.id, item.logDate);
      router.push(`/meals?date=${item.logDate}`);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => router.push(`/meals?date=${item.logDate}`)}
        className="mb-4 flex items-center gap-1 text-sm text-[var(--color-muted-foreground)]"
      >
        <ChevronLeft className="h-4 w-4" />
        Tilbake
      </button>

      <h1 className="text-xl font-bold leading-tight">{item.productName}</h1>
      {item.brand && (
        <p className="text-sm text-[var(--color-muted-foreground)]">{item.brand}</p>
      )}
      <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
        {MEAL_LABELS[item.mealType]} · {formatDate(item.logDate)}
      </p>

      <div className="mt-6 space-y-3">
        {/* Calories */}
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
          <p className="text-xs text-[var(--color-muted-foreground)]">Kalorier</p>
          <p className="mt-0.5 text-3xl font-bold">
            {kcal}{" "}
            <span className="text-base font-normal text-[var(--color-muted-foreground)]">kcal</span>
          </p>
        </div>

        {/* Quantity */}
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
          <p className="text-xs text-[var(--color-muted-foreground)]">Mengde</p>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
              className="w-24 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <span className="text-sm text-[var(--color-muted-foreground)]">g</span>
          </div>
        </div>

        {/* Per 100g breakdown */}
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
          <p className="mb-2 text-xs font-medium text-[var(--color-muted-foreground)]">
            Næringsinnhold per 100 g
          </p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span>Kalorier</span>
              <span className="font-medium">{Math.round(item.kcalPer100g)} kcal</span>
            </div>
            <div className="flex justify-between text-sm text-[var(--color-muted-foreground)]">
              <span>Protein</span>
              <span>–</span>
            </div>
            <div className="flex justify-between text-sm text-[var(--color-muted-foreground)]">
              <span>Karbohydrater</span>
              <span>–</span>
            </div>
            <div className="flex justify-between text-sm text-[var(--color-muted-foreground)]">
              <span>Fett</span>
              <span>–</span>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-[var(--red)]">{error}</p>}

      <div className="mt-6 flex flex-col gap-2">
        <Button
          type="button"
          disabled={!valid || saving}
          onClick={handleSave}
          className="w-full"
        >
          {saving ? "Lagrer…" : "Lagre"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={deleting}
          onClick={handleDelete}
          className="w-full text-[var(--red)]"
        >
          {deleting ? "Sletter…" : "Slett matvare"}
        </Button>
      </div>
    </div>
  );
}
