"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2, X, ChefHat } from "lucide-react";
import type { RecipeDetail, RecipeIngredientRow } from "@/lib/recipes";
import type { FoodProductSummary } from "@/lib/foods/types";
import { FoodSearchInput } from "../components/food-search-input";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";

interface Props {
  initial: RecipeDetail;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function formatKcal(n: number) {
  return `${Math.round(n)} kcal`;
}

export function RecipeEditor({ initial }: Props) {
  const router = useRouter();
  const [recipe, setRecipe] = useState<RecipeDetail>(initial);
  const [name, setName] = useState(initial.name);
  const [editingName, setEditingName] = useState(false);
  const [cookedWeight, setCookedWeight] = useState(
    initial.cookedWeightG != null ? String(initial.cookedWeightG) : "",
  );
  const [savingCookedWeight, setSavingCookedWeight] = useState(false);
  const [addingProduct, setAddingProduct] = useState<FoodProductSummary | null>(null);
  const [addQty, setAddQty] = useState("100");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingRecipe, setDeletingRecipe] = useState(false);
  const [showDeleteRecipeConfirm, setShowDeleteRecipeConfirm] = useState(false);
  const [editingQty, setEditingQty] = useState<{ id: string; value: string } | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === recipe.name) {
      setName(recipe.name);
      setEditingName(false);
      return;
    }
    const res = await fetch(`/api/recipes/${recipe.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) setRecipe(await res.json());
    setEditingName(false);
  }

  async function saveCookedWeight() {
    const val = cookedWeight.trim();
    const parsed = val === "" ? null : parseFloat(val);
    if (parsed !== null && (isNaN(parsed) || parsed <= 0)) return;
    setSavingCookedWeight(true);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookedWeightG: parsed }),
      });
      if (res.ok) setRecipe(await res.json());
    } finally {
      setSavingCookedWeight(false);
    }
  }

  async function handleAddIngredient() {
    if (!addingProduct || addingProduct.kcalPer100g == null) return;
    const qty = parseFloat(addQty);
    if (!qty || qty <= 0) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/ingredients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodProductId: addingProduct.id,
          productName: addingProduct.name,
          kcalPer100g: addingProduct.kcalPer100g,
          quantityGrams: qty,
        }),
      });
      if (res.ok) {
        setRecipe(await res.json());
        setAddingProduct(null);
        setAddQty("100");
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteIngredient(ingredientId: string) {
    setDeleting(ingredientId);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/ingredients/${ingredientId}`, {
        method: "DELETE",
      });
      if (res.ok) setRecipe(await res.json());
    } finally {
      setDeleting(null);
    }
  }

  async function handleUpdateQty(ingredient: RecipeIngredientRow) {
    if (!editingQty) return;
    const qty = parseFloat(editingQty.value);
    if (!qty || qty <= 0) {
      setEditingQty(null);
      return;
    }
    const res = await fetch(`/api/recipes/${recipe.id}/ingredients/${ingredient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantityGrams: qty }),
    });
    if (res.ok) setRecipe(await res.json());
    setEditingQty(null);
  }

  async function doDeleteRecipe() {
    setDeletingRecipe(true);
    await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
    router.push("/meals/recipes");
  }

  const effectiveWeight = recipe.cookedWeightG ?? recipe.totalWeightG;

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/meals/recipes"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text2)] hover:bg-[var(--card2)]"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        {editingName ? (
          <input
            ref={nameRef}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            className="flex-1 rounded-[var(--radius-sm)] border border-[var(--accent)] bg-[var(--bg)] px-3 py-1.5 text-lg font-semibold text-[var(--text1)] focus:outline-none"
          />
        ) : (
          <button
            onClick={() => { setEditingName(true); setTimeout(() => nameRef.current?.select(), 0); }}
            className="flex-1 text-left text-xl font-semibold text-[var(--text1)] hover:text-[var(--accent)]"
          >
            {recipe.name}
          </button>
        )}
        <button
          onClick={() => setShowDeleteRecipeConfirm(true)}
          disabled={deletingRecipe}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text3)] hover:bg-[var(--card2)] hover:text-[var(--red)] disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Nutrition summary */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-[var(--radius-md)] bg-[var(--card)] px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-[var(--text1)]">{Math.round(recipe.kcalPer100g)}</p>
          <p className="text-xs text-[var(--text3)]">kcal/100g</p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--card)] px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-[var(--text1)]">{Math.round(recipe.totalKcal)}</p>
          <p className="text-xs text-[var(--text3)]">kcal totalt</p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--card)] px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-[var(--text1)]">{Math.round(effectiveWeight)}</p>
          <p className="text-xs text-[var(--text3)]">gram</p>
        </div>
      </div>

      {/* Cooked weight override */}
      <div className="mb-4 flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text1)]">Kokt vekt (valgfritt)</p>
          <p className="text-xs text-[var(--text3)]">
            Endre til faktisk vekt etter tilberedning — påvirker kcal/100g
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number"
            min="1"
            placeholder={String(Math.round(recipe.totalWeightG))}
            value={cookedWeight}
            onChange={(e) => setCookedWeight(e.target.value)}
            onBlur={saveCookedWeight}
            onKeyDown={(e) => e.key === "Enter" && saveCookedWeight()}
            className="w-20 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-right text-sm text-[var(--text1)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
          />
          <span className="text-sm text-[var(--text3)]">g</span>
          {savingCookedWeight && <span className="text-xs text-[var(--text3)]">…</span>}
        </div>
      </div>

      {/* Ingredients */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--text2)]">
          Ingredienser ({recipe.ingredients.length})
        </p>
      </div>

      {recipe.ingredients.length === 0 ? (
        <div className="mb-4 flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] py-8 text-center">
          <ChefHat className="h-8 w-8 text-[var(--text3)]" />
          <p className="text-sm text-[var(--text2)]">Legg til ingredienser nedenfor</p>
        </div>
      ) : (
        <ul className="mb-4 flex flex-col gap-1">
          {recipe.ingredients.map((ing) => (
            <li
              key={ing.id}
              className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-[var(--text1)]">{ing.productName}</p>
                <p className="text-xs text-[var(--text3)]">
                  {round1(ing.kcalPer100g)} kcal/100g · {formatKcal(ing.caloriesKcal)}
                </p>
              </div>
              {editingQty?.id === ing.id ? (
                <input
                  autoFocus
                  type="number"
                  min="1"
                  value={editingQty.value}
                  onChange={(e) => setEditingQty({ id: ing.id, value: e.target.value })}
                  onBlur={() => handleUpdateQty(ing)}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdateQty(ing)}
                  className="w-16 rounded-[var(--radius-sm)] border border-[var(--accent)] bg-[var(--bg)] px-2 py-1 text-right text-sm focus:outline-none"
                />
              ) : (
                <button
                  onClick={() => setEditingQty({ id: ing.id, value: String(ing.quantityGrams) })}
                  className="rounded px-2 py-1 text-sm font-medium text-[var(--text1)] hover:bg-[var(--card2)]"
                >
                  {ing.quantityGrams}g
                </button>
              )}
              <button
                onClick={() => handleDeleteIngredient(ing.id)}
                disabled={deleting === ing.id}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--text3)] hover:text-[var(--red)] disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add ingredient */}
      {addingProduct ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-medium text-[var(--text1)] truncate pr-2">{addingProduct.name}</p>
            <button onClick={() => setAddingProduct(null)} className="text-[var(--text3)] hover:text-[var(--text1)]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mb-3 text-xs text-[var(--text3)]">
            {addingProduct.kcalPer100g != null ? `${round1(addingProduct.kcalPer100g)} kcal/100g` : ""}{" "}
            {addingProduct.kcalPer100g != null && parseFloat(addQty) > 0
              ? `· ${formatKcal((addingProduct.kcalPer100g * parseFloat(addQty)) / 100)}`
              : "—"}
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                autoFocus
                type="number"
                min="1"
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddIngredient()}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 pr-8 text-[var(--text1)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text3)]">g</span>
            </div>
            <button
              onClick={handleAddIngredient}
              disabled={adding || !addQty || parseFloat(addQty) <= 0}
              className="rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {adding ? "…" : "Legg til"}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-3">
          <FoodSearchInput
            placeholder="Søk etter ingrediens…"
            onSelect={(product) => {
              setAddingProduct(product);
              setAddQty("100");
            }}
          />
        </div>
      )}

      <ConfirmSheet
        open={showDeleteRecipeConfirm}
        message={`Slett "${recipe.name}"?`}
        onConfirm={() => { setShowDeleteRecipeConfirm(false); void doDeleteRecipe(); }}
        onCancel={() => setShowDeleteRecipeConfirm(false)}
      />
    </div>
  );
}
