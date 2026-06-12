"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { MealType } from "@/db/schema";
import { addMealItemAction } from "@/lib/actions/meals";
import type { FoodProductSummary } from "@/lib/foods/types";
import { calculateCaloriesFromGrams } from "@/lib/kassal/nutrition";
import { BarcodeScanner } from "@/components/meals/barcode-scanner";
import { FoodScanWizard } from "@/components/meals/food-scan-wizard";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";

type Mode = "search" | "scan" | "photo";

function sourceLabel(product: FoodProductSummary): string {
  if (product.source === "matvaretabellen") return "Matvaretabellen";
  if (product.source === "custom") return product.name.split(":")[0]?.trim() ?? "Egendefinert";
  if (product.source === "kassal") {
    return product.brand ? `Kassal.app · ${product.brand}` : "Kassal.app";
  }
  return "Ukjent kilde";
}

const SOURCE_ORDER = { kassal: 0, matvaretabellen: 1, custom: 2 } as const;

function sortBySource(products: FoodProductSummary[]): FoodProductSummary[] {
  return [...products].sort(
    (a, b) => (SOURCE_ORDER[a.source] ?? 9) - (SOURCE_ORDER[b.source] ?? 9),
  );
}

function groupTitle(source: FoodProductSummary["source"]): string {
  if (source === "kassal") return "Kassal.app";
  if (source === "matvaretabellen") return "Matvaretabellen";
  return "Egne produkter";
}

function groupResults(products: FoodProductSummary[]): Array<{ title: string; items: FoodProductSummary[] }> {
  const groups: Array<{ title: string; items: FoodProductSummary[] }> = [];
  for (const product of sortBySource(products)) {
    const title = groupTitle(product.source);
    const last = groups[groups.length - 1];
    if (last?.title === title) {
      last.items.push(product);
    } else {
      groups.push({ title, items: [product] });
    }
  }
  return groups;
}

export function ProductPicker({
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
  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodProductSummary[]>([]);
  const [selected, setSelected] = useState<FoodProductSummary | null>(null);
  const [quantityGrams, setQuantityGrams] = useState("");
  const [eanInput, setEanInput] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [eanNotFound, setEanNotFound] = useState(false);
  const [photoInitialEan, setPhotoInitialEan] = useState<string | undefined>();
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCustomAdd(ean?: string) {
    setPhotoInitialEan(ean);
    setEanNotFound(false);
    setLookupError(null);
    setMode("photo");
  }

  const kcalPreview = useMemo(() => {
    if (!selected?.kcalPer100g || !quantityGrams) return null;
    const grams = Number(quantityGrams);
    if (!Number.isFinite(grams) || grams <= 0) return null;
    return calculateCaloriesFromGrams(selected.kcalPer100g, grams);
  }, [quantityGrams, selected]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    const timer = setTimeout(async () => {
      setSearchError(null);
      try {
        const res = await fetch(`/api/foods/search?search=${encodeURIComponent(trimmed)}`);
        if (!res.ok) {
          setResults([]);
          setSearchError(res.status === 503 ? "Matvare-API er ikke konfigurert." : "Søk feilet.");
          return;
        }
        const json = (await res.json()) as { data: FoodProductSummary[] };
        setResults(json.data ?? []);
      } catch {
        setSearchError("Søk feilet.");
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setSearchError(null);
    }
  }

  function selectProduct(product: FoodProductSummary) {
    setSelected(product);
    setLookupError(null);
    if (product.packageGrams) {
      setQuantityGrams(String(Math.round(product.packageGrams)));
    }
  }

  async function lookupEan(ean: string) {
    const normalized = ean.replace(/\D/g, "");
    if (!normalized) return;

    setLookupError(null);
    setEanNotFound(false);
    setSelected(null);
    try {
      const res = await fetch(`/api/foods/ean/${encodeURIComponent(normalized)}`);
      if (!res.ok) {
        if (res.status === 404) {
          setEanInput(normalized);
          setEanNotFound(true);
          setLookupError("Fant ikke produkt for denne strekkoden.");
        } else {
          setLookupError("Oppslag feilet.");
        }
        return;
      }
      const json = (await res.json()) as { data: FoodProductSummary };
      selectProduct(json.data);
    } catch {
      setLookupError("Oppslag feilet.");
    }
  }

  function handleAdd() {
    if (!selected?.kcalPer100g) return;
    const formData = new FormData();
    formData.set("logDate", logDate);
    formData.set("mealType", mealType);
    if (selected.id) formData.set("foodProductId", selected.id);
    formData.set("source", selected.source);
    formData.set("externalId", selected.externalId);
    if (selected.ean) formData.set("ean", selected.ean);
    formData.set("quantityGrams", quantityGrams);

    startTransition(async () => {
      const result = await addMealItemAction(null, formData);
      if (result.ok) {
        onAdded();
        onClose();
      } else {
        setLookupError(result.error);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-[640px] overflow-y-auto rounded-t-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-lg sm:rounded-[var(--radius-lg)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Legg til produkt</h3>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Lukk
          </Button>
        </div>

        {!selected ? (
          <>
            <div className="mb-3 grid grid-cols-3 gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === "search" ? "default" : "outline"}
                onClick={() => setMode("search")}
              >
                Søk
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "scan" ? "default" : "outline"}
                onClick={() => setMode("scan")}
              >
                Strekkode
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "photo" ? "default" : "outline"}
                onClick={() => setMode("photo")}
              >
                Bilde
              </Button>
            </div>

            {mode === "search" ? (
              <div className="space-y-2">
                <Label htmlFor="product-search">Produktnavn</Label>
                <Input
                  id="product-search"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="F.eks. havregryn eller yoghurt"
                  autoFocus
                />
                {searchError ? <p className="text-xs text-[#9a5b45]">{searchError}</p> : null}
                <ul className="max-h-52 space-y-2 overflow-y-auto">
                  {groupResults(results).map((group) => (
                    <li key={group.title}>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                        {group.title}
                      </p>
                      <ul className="space-y-1">
                        {group.items.map((product) => (
                          <li key={`${product.source}-${product.externalId}`}>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-2 py-2 text-left text-sm hover:bg-[var(--color-muted)]"
                              onClick={() => selectProduct(product)}
                            >
                              {product.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={product.image}
                                  alt=""
                                  className="h-10 w-10 shrink-0 rounded object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 shrink-0 rounded bg-[var(--color-muted)]" />
                              )}
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{product.name}</span>
                                <span className="block truncate text-xs text-[var(--color-muted-foreground)]">
                                  {product.source === "kassal" && product.brand
                                    ? product.brand
                                    : sourceLabel(product)}
                                  {product.kcalPer100g != null
                                    ? ` · ${product.kcalPer100g} kcal/100g`
                                    : ""}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            ) : mode === "scan" ? (
              <div className="space-y-3">
                <BarcodeScanner
                  onDetected={lookupEan}
                  onError={(message) => setLookupError(message)}
                />
                <div>
                  <Label htmlFor="ean-manual">EAN / strekkode</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ean-manual"
                      inputMode="numeric"
                      value={eanInput}
                      onChange={(e) => setEanInput(e.target.value)}
                      placeholder="7039010019811"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => lookupEan(eanInput)}
                    >
                      Slå opp
                    </Button>
                  </div>
                </div>
                {lookupError ? (
                  <div className="space-y-2">
                    <p className="text-xs text-[#9a5b45]">{lookupError}</p>
                    {eanNotFound ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => openCustomAdd(eanInput.replace(/\D/g, "") || undefined)}
                      >
                        Legg til selv med bilde →
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <FoodScanWizard
                initialEan={photoInitialEan}
                onSaved={(product) => selectProduct(product)}
                onUseExisting={(product) => selectProduct(product)}
                onCancel={() => {
                  setPhotoInitialEan(undefined);
                  setMode("search");
                }}
              />
            )}
          </>
        ) : (
          <div className="space-y-3">
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
              <p className="font-medium">{selected.name}</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">{sourceLabel(selected)}</p>
              {selected.kcalPer100g != null ? (
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  {selected.kcalPer100g} kcal per 100 g
                </p>
              ) : (
                <p className="mt-1 text-xs text-[#9a5b45]">Mangler kaloridata for dette produktet.</p>
              )}
            </div>

            <div>
              <Label htmlFor="quantity-grams">Vekt (gram)</Label>
              <Input
                id="quantity-grams"
                name="quantityGrams"
                type="number"
                inputMode="decimal"
                step="1"
                min="1"
                value={quantityGrams}
                onChange={(e) => setQuantityGrams(e.target.value)}
                placeholder="150"
              />
              <FieldError message={lookupError ?? undefined} />
            </div>

            {kcalPreview != null ? (
              <p className="text-sm font-medium text-[var(--color-primary)]">
                ≈ {kcalPreview} kcal
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setSelected(null)}>
                Tilbake
              </Button>
              <Button
                type="button"
                size="sm"
                className="flex-1"
                disabled={pending || !selected.kcalPer100g || !quantityGrams}
                onClick={handleAdd}
              >
                {pending ? "Lagrer..." : "Legg til"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
