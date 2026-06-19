"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { MealType } from "@/db/schema";
import { addMealItemAction } from "@/lib/actions/meals";
import { addSavedMealToLogAction, getSavedMealsAction } from "@/lib/actions/saved-meals";
import type { FoodProductSummary } from "@/lib/foods/types";
import { calculateCaloriesFromGrams } from "@/lib/kassal/nutrition";
import {
  BarcodeScanner,
  cameraErrorMessage,
  requestCameraStream,
} from "@/components/meals/barcode-scanner";
import { FoodScanWizard } from "@/components/meals/food-scan-wizard";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { BookOpen, Camera, Pencil, ScanBarcode, Search, X } from "lucide-react";
import { setPrettyNameAction } from "@/lib/actions/foods";
import { cn } from "@/lib/utils";

type Mode = "search" | "scan" | "photo" | "saved";
type Unit = "g" | "dl" | "flaske" | "boks";

const UNIT_FACTOR: Record<Unit, number> = { g: 1, dl: 100, flaske: 333, boks: 500 };
const UNITS: Unit[] = ["g", "dl", "flaske", "boks"];

function toGrams(qty: number, unit: Unit): number {
  return Math.round(qty * UNIT_FACTOR[unit]);
}

function sourceLabel(product: FoodProductSummary): string {
  if (product.source === "matvaretabellen") return "Matvaretabellen";
  if (product.source === "custom") return product.name.split(":")[0]?.trim() ?? "Egendefinert";
  if (product.source === "kassal") {
    return product.brand ? `Kassal.app · ${product.brand}` : "Kassal.app";
  }
  return "Ukjent kilde";
}

const SOURCE_ORDER = { matvaretabellen: 0, kassal: 1, custom: 2 } as const;

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

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  const [results, setResults] = useState<FoodProductSummary[]>([]);
  const [selected, setSelected] = useState<FoodProductSummary | null>(null);
  const [quantityInput, setQuantityInput] = useState("");
  const [unit, setUnit] = useState<Unit>("g");
  const [prettyNameInput, setPrettyNameInput] = useState("");
  const [eanInput, setEanInput] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [eanNotFound, setEanNotFound] = useState(false);
  const [photoInitialEan, setPhotoInitialEan] = useState<string | undefined>();
  const [searchError, setSearchError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [pending, startTransition] = useTransition();

  const stopCameraStream = useCallback(() => {
    setCameraStream((current) => {
      current?.getTracks().forEach((track) => track.stop());
      return null;
    });
  }, []);

  const activateScanMode = useCallback(async () => {
    setLookupError(null);
    stopCameraStream();
    try {
      const stream = await requestCameraStream();
      setCameraStream(stream);
      setMode("scan");
    } catch (error) {
      setMode("scan");
      setLookupError(cameraErrorMessage(error));
    }
  }, [stopCameraStream]);

  const [savedMeals, setSavedMeals] = useState<
    Array<{ id: string; name: string; totalKcal: number; totalGrams: number }>
  >([]);
  const [savedMealsLoaded, setSavedMealsLoaded] = useState(false);
  const [addingSavedId, setAddingSavedId] = useState<string | null>(null);

  async function loadSavedMeals() {
    if (savedMealsLoaded) return;
    const result = await getSavedMealsAction();
    if (result.ok) setSavedMeals(result.data);
    setSavedMealsLoaded(true);
  }

  const switchMode = useCallback(
    (id: Mode) => {
      if (id === "scan") {
        void activateScanMode();
        return;
      }
      stopCameraStream();
      setMode(id);
      if (id === "saved") void loadSavedMeals();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activateScanMode, stopCameraStream],
  );

  useEffect(() => () => stopCameraStream(), [stopCameraStream]);

  function openCustomAdd(ean?: string) {
    setPhotoInitialEan(ean);
    setEanNotFound(false);
    setLookupError(null);
    setMode("photo");
  }

  const kcalPreview = useMemo(() => {
    if (!selected?.kcalPer100g || !quantityInput) return null;
    const qty = Number(quantityInput);
    if (!Number.isFinite(qty) || qty <= 0) return null;
    return calculateCaloriesFromGrams(selected.kcalPer100g, toGrams(qty, unit));
  }, [selected, quantityInput, unit]);

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
    setUnit("g");
    setQuantityInput(product.packageGrams ? String(Math.round(product.packageGrams)) : "");
    setPrettyNameInput(product.prettyName ?? "");
  }

  async function savePrettyName() {
    if (!selected?.id) return;
    await setPrettyNameAction(selected.id, prettyNameInput);
  }

  function changeUnit(next: Unit) {
    const current = Number(quantityInput);
    if (Number.isFinite(current) && current > 0) {
      const converted = (current * UNIT_FACTOR[unit]) / UNIT_FACTOR[next];
      setQuantityInput(String(parseFloat(converted.toFixed(2))));
    }
    setUnit(next);
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
    const grams = toGrams(Number(quantityInput), unit);
    if (!grams || grams <= 0) {
      setLookupError("Skriv inn mengde.");
      return;
    }
    const formData = new FormData();
    formData.set("logDate", logDate);
    formData.set("mealType", mealType);
    if (selected.id) formData.set("foodProductId", selected.id);
    formData.set("source", selected.source);
    formData.set("externalId", selected.externalId);
    if (selected.ean) formData.set("ean", selected.ean);
    formData.set("quantityGrams", String(grams));

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

  async function handleAddSavedMeal(savedMealId: string) {
    setAddingSavedId(savedMealId);
    const result = await addSavedMealToLogAction(savedMealId, logDate, mealType);
    setAddingSavedId(null);
    if (result.ok) { onAdded(); onClose(); }
    else setLookupError(result.error ?? null);
  }

  const modeTabs: Array<{ id: Mode; label: string; icon: typeof Search }> = [
    { id: "search", label: "Søk", icon: Search },
    { id: "scan", label: "Strekkode", icon: ScanBarcode },
    { id: "photo", label: "Bilde", icon: Camera },
    { id: "saved", label: "Måltider", icon: BookOpen },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[min(88svh,100%)] w-full max-w-[640px] flex-col overflow-hidden rounded-t-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg sm:max-h-[90svh] sm:rounded-[var(--radius-lg)]">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2">
          {!selected ? (
            <div className="flex gap-0.5">
              {modeTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-label={label}
                  aria-current={mode === id ? "true" : undefined}
                  onClick={() => switchMode(id)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] transition-colors",
                    mode === id
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                      : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </button>
              ))}
            </div>
          ) : (
            <div className="h-10" />
          )}
          <button
            type="button"
            aria-label="Lukk"
            onClick={onClose}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" onTouchMove={(e) => e.stopPropagation()}>
        {!selected ? (
          <>
            {mode === "search" ? (
              <div className="space-y-2">
                <Input
                  id="product-search"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Søk produkt…"
                  autoComplete="off"
                  enterKeyHint="search"
                />
                {searchError ? <p className="text-xs text-[#9a5b45]">{searchError}</p> : null}
                <ul className="max-h-[min(40svh,16rem)] space-y-2 overflow-y-auto">
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
                                <span className="block truncate font-medium">
                                  {product.prettyName ?? product.name}
                                </span>
                                {product.prettyName && (
                                  <span className="block truncate text-xs text-[var(--text3)]">
                                    {product.name}
                                  </span>
                                )}
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
              <div className="space-y-2">
                <BarcodeScanner
                  stream={cameraStream}
                  onDetected={lookupEan}
                  onError={(message) => setLookupError(message)}
                  onRetry={() => void activateScanMode()}
                />
                <div className="flex gap-2">
                  <Input
                    id="ean-manual"
                    inputMode="numeric"
                    value={eanInput}
                    onChange={(e) => setEanInput(e.target.value)}
                    placeholder="EAN"
                    className="min-w-0 flex-1"
                    enterKeyHint="go"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void lookupEan(eanInput);
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    onClick={() => lookupEan(eanInput)}
                  >
                    OK
                  </Button>
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
            ) : mode === "saved" ? (
              <div className="space-y-2">
                {!savedMealsLoaded ? (
                  <p className="text-xs text-[var(--color-muted-foreground)]">Laster…</p>
                ) : savedMeals.length === 0 ? (
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Ingen lagrede måltider ennå. Logg et måltid og trykk «+ Legg til som eget måltid».
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {savedMeals.map((meal) => (
                      <li key={meal.id}>
                        <button
                          type="button"
                          disabled={addingSavedId === meal.id}
                          onClick={() => handleAddSavedMeal(meal.id)}
                          className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2.5 text-left hover:bg-[var(--color-muted)]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{meal.name}</p>
                            <p className="text-xs text-[var(--color-muted-foreground)]">
                              {meal.totalGrams} g · {meal.totalKcal} kcal
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-[var(--color-primary)]">
                            {addingSavedId === meal.id ? "..." : "+ Legg til"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {lookupError ? <p className="text-xs text-[#9a5b45]">{lookupError}</p> : null}
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
              <p className="font-medium">{selected.prettyName ?? selected.name}</p>
              {selected.prettyName && (
                <p className="text-xs text-[var(--text3)] truncate">{selected.name}</p>
              )}
              <p className="text-xs text-[var(--color-muted-foreground)]">{sourceLabel(selected)}</p>
              {selected.kcalPer100g != null ? (
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  {selected.kcalPer100g} kcal per 100 g
                </p>
              ) : (
                <p className="mt-1 text-xs text-[#9a5b45]">Mangler kaloridata for dette produktet.</p>
              )}
            </div>

            {selected.id && (
              <div>
                <Label htmlFor="pretty-name" className="flex items-center gap-1">
                  <Pencil className="h-3 w-3" /> Kort navn
                </Label>
                <Input
                  id="pretty-name"
                  value={prettyNameInput}
                  onChange={(e) => setPrettyNameInput(e.target.value)}
                  onBlur={savePrettyName}
                  placeholder={selected.name}
                  className="text-sm"
                />
              </div>
            )}

            <div>
              <Label htmlFor="quantity-grams">Mengde</Label>
              <div className="flex gap-2">
                <Input
                  id="quantity-grams"
                  type="number"
                  inputMode="decimal"
                  value={quantityInput}
                  onChange={(e) => setQuantityInput(e.target.value)}
                  placeholder={unit === "g" ? "150" : unit === "dl" ? "2" : "1"}
                  className="flex-1"
                  autoFocus
                />
                <div className="flex shrink-0 overflow-hidden rounded-xl border border-[var(--border)]">
                  {UNITS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => changeUnit(u)}
                      className={cn(
                        "px-2.5 py-2 text-xs font-medium transition-colors",
                        u === unit
                          ? "bg-[var(--accent)] text-[var(--card)]"
                          : "text-[var(--text3)] hover:text-[var(--text1)]",
                      )}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <FieldError message={lookupError ?? undefined} />
            </div>

            {kcalPreview != null ? (
              <p className="text-sm font-medium text-[var(--accent)]">≈ {kcalPreview} kcal</p>
            ) : null}

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setSelected(null)}>
                Tilbake
              </Button>
              <Button
                type="button"
                size="sm"
                className="flex-1"
                disabled={pending || !selected.kcalPer100g || !quantityInput}
                onClick={handleAdd}
              >
                {pending ? "Lagrer..." : "Legg til"}
              </Button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
