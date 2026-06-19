"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, ScanBarcode, Search, Zap } from "lucide-react";
import type { MealType } from "@/db/schema";
import { addMealItemAction, quickAddMealItemAction, getRecentMealItemsAction, reAddMealItemAction, type RecentMealItem } from "@/lib/actions/meals";
import { addSavedMealToLogAction, getSavedMealsAction } from "@/lib/actions/saved-meals";
import type { FoodProductSummary } from "@/lib/foods/types";
import { calculateCaloriesFromGrams } from "@/lib/kassal/nutrition";
import { BarcodeScanner, cameraErrorMessage, requestCameraStream } from "@/components/meals/barcode-scanner";
import { FoodScanWizard } from "@/components/meals/food-scan-wizard";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { MEAL_LABELS } from "@/lib/meals/constants";
import { cn } from "@/lib/utils";

type Tab = "search" | "scan" | "quick" | "saved";
type Unit = "g" | "dl" | "flaske" | "boks";

const UNIT_FACTOR: Record<Unit, number> = { g: 1, dl: 100, flaske: 333, boks: 500 };
const UNIT_LABEL: Record<Unit, string> = { g: "g", dl: "dl", flaske: "flaske", boks: "boks" };
const UNITS: Unit[] = ["g", "dl", "flaske", "boks"];

function toGrams(qty: number, unit: Unit): number {
  return Math.round(qty * UNIT_FACTOR[unit]);
}

function sourceLabel(p: FoodProductSummary) {
  if (p.source === "matvaretabellen") return "Matvaretabellen";
  if (p.source === "custom") return p.name.split(":")[0]?.trim() ?? "Egendefinert";
  return p.brand ? `Kassal.app · ${p.brand}` : "Kassal.app";
}

const SOURCE_ORDER = { kassal: 0, matvaretabellen: 1, custom: 2 } as const;

function groupResults(products: FoodProductSummary[]) {
  const sorted = [...products].sort(
    (a, b) => (SOURCE_ORDER[a.source] ?? 9) - (SOURCE_ORDER[b.source] ?? 9),
  );
  const groups: Array<{ title: string; items: FoodProductSummary[] }> = [];
  for (const p of sorted) {
    const title =
      p.source === "kassal" ? "Kassal.app" : p.source === "matvaretabellen" ? "Matvaretabellen" : "Egne produkter";
    const last = groups[groups.length - 1];
    if (last?.title === title) last.items.push(p);
    else groups.push({ title, items: [p] });
  }
  return groups;
}

export function MealAddView({ logDate, mealType }: { logDate: string; mealType: MealType }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("search");

  // Search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodProductSummary[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Selected product
  const [selected, setSelected] = useState<FoodProductSummary | null>(null);
  const [quantityInput, setQuantityInput] = useState("");
  const [unit, setUnit] = useState<Unit>("g");
  const [addError, setAddError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Scan
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [eanInput, setEanInput] = useState("");
  const [eanError, setEanError] = useState<string | null>(null);
  const [eanNotFound, setEanNotFound] = useState(false);
  const [photoInitialEan, setPhotoInitialEan] = useState<string | undefined>();
  const [showWizard, setShowWizard] = useState(false);

  // Quick add
  const [quickName, setQuickName] = useState("");
  const [quickKcal, setQuickKcal] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickDone, setQuickDone] = useState(false);

  // Recent items (history)
  const [recentItems, setRecentItems] = useState<RecentMealItem[]>([]);
  const [recentLoaded, setRecentLoaded] = useState(false);
  const [addingRecentName, setAddingRecentName] = useState<string | null>(null);

  // Saved meals
  const [savedMeals, setSavedMeals] = useState<Array<{ id: string; name: string; totalKcal: number; totalGrams: number }>>([]);
  const [savedLoaded, setSavedLoaded] = useState(false);
  const [savedError, setSavedError] = useState<string | null>(null);
  const [addingSavedId, setAddingSavedId] = useState<string | null>(null);

  useEffect(() => {
    if (!recentLoaded) {
      getRecentMealItemsAction().then((res) => {
        if (res.ok) setRecentItems(res.data);
        setRecentLoaded(true);
      });
    }
  }, [recentLoaded]);

  const stopCamera = useCallback(() => {
    setCameraStream((s) => { s?.getTracks().forEach((t) => t.stop()); return null; });
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (trimmed.length < 2) { setResults([]); setSearchError(null); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/foods/search?search=${encodeURIComponent(trimmed)}`);
        if (!res.ok) { setResults([]); setSearchError("Søk feilet."); return; }
        const json = (await res.json()) as { data: FoodProductSummary[] };
        setResults(json.data ?? []);
        setSearchError(null);
      } catch { setSearchError("Søk feilet."); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  async function switchTab(t: Tab) {
    stopCamera();
    setSelected(null);
    setAddError(null);
    setTab(t);
    if (t === "scan") {
      try {
        const stream = await requestCameraStream();
        setCameraStream(stream);
      } catch (err) {
        setEanError(cameraErrorMessage(err));
      }
    }
    if (t === "saved") {
      setSavedError(null);
      setSavedLoaded(false);
      const res = await getSavedMealsAction();
      if (res.ok) {
        setSavedMeals(res.data);
      } else {
        setSavedError("Henting feilet — prøv igjen.");
      }
      setSavedLoaded(true);
    }
  }

  function selectProduct(p: FoodProductSummary) {
    setSelected(p);
    setAddError(null);
    setUnit("g");
    if (p.packageGrams) setQuantityInput(String(Math.round(p.packageGrams)));
    else setQuantityInput("");
  }

  function changeUnit(next: Unit) {
    const current = Number(quantityInput);
    if (Number.isFinite(current) && current > 0) {
      const grams = current * UNIT_FACTOR[unit];
      const converted = grams / UNIT_FACTOR[next];
      setQuantityInput(String(parseFloat(converted.toFixed(2))));
    }
    setUnit(next);
  }

  async function lookupEan(ean: string) {
    const normalized = ean.replace(/\D/g, "");
    if (!normalized) return;
    setEanError(null); setEanNotFound(false); setSelected(null);
    try {
      const res = await fetch(`/api/foods/ean/${encodeURIComponent(normalized)}`);
      if (!res.ok) {
        if (res.status === 404) { setEanInput(normalized); setEanNotFound(true); setEanError("Fant ikke produkt for denne strekkoden."); }
        else setEanError("Oppslag feilet.");
        return;
      }
      const json = (await res.json()) as { data: FoodProductSummary };
      selectProduct(json.data);
    } catch { setEanError("Oppslag feilet."); }
  }

  const kcalPreview = useMemo(() => {
    if (!selected?.kcalPer100g || !quantityInput) return null;
    const qty = Number(quantityInput);
    if (!Number.isFinite(qty) || qty <= 0) return null;
    return calculateCaloriesFromGrams(selected.kcalPer100g, toGrams(qty, unit));
  }, [selected, quantityInput, unit]);

  function handleAdd() {
    if (!selected?.kcalPer100g) return;
    const grams = toGrams(Number(quantityInput), unit);
    if (!grams || grams <= 0) { setAddError("Skriv inn mengde."); return; }
    const fd = new FormData();
    fd.set("logDate", logDate);
    fd.set("mealType", mealType);
    if (selected.id) fd.set("foodProductId", selected.id);
    fd.set("source", selected.source);
    fd.set("externalId", selected.externalId);
    if (selected.ean) fd.set("ean", selected.ean);
    fd.set("quantityGrams", String(grams));
    startTransition(async () => {
      const result = await addMealItemAction(null, fd);
      if (result.ok) router.back();
      else setAddError(result.error ?? null);
    });
  }

  function handleQuickAdd() {
    const kcal = Number(quickKcal);
    if (!kcal || kcal <= 0) { setQuickError("Skriv inn kalorier."); return; }
    startTransition(async () => {
      const result = await quickAddMealItemAction(logDate, mealType, quickName, kcal);
      if (result.ok) {
        setQuickDone(true);
        setQuickName(""); setQuickKcal(""); setQuickError(null);
        setTimeout(() => { setQuickDone(false); router.back(); }, 600);
      } else setQuickError(result.error ?? null);
    });
  }

  async function handleReAdd(item: RecentMealItem) {
    setAddingRecentName(item.productName);
    const result = await reAddMealItemAction(logDate, mealType, item);
    setAddingRecentName(null);
    if (result.ok) router.back();
  }

  async function handleAddSavedMeal(id: string) {
    setAddingSavedId(id);
    const result = await addSavedMealToLogAction(id, logDate, mealType);
    setAddingSavedId(null);
    if (result.ok) router.back();
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof Search }> = [
    { id: "search", label: "Søk", icon: Search },
    { id: "scan", label: "Strekkode", icon: ScanBarcode },
    { id: "quick", label: "Hurtig", icon: Zap },
    { id: "saved", label: "Måltider", icon: BookOpen },
  ];

  // ---------- Selected product confirm ----------
  if (selected) {
    return (
      <div className="app-content space-y-4">
        <button type="button" onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-[var(--color-muted-foreground)]">
          <ArrowLeft className="h-4 w-4" /> Tilbake
        </button>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
          <p className="font-medium">{selected.name}</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">{sourceLabel(selected)}</p>
          {selected.kcalPer100g != null
            ? <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{selected.kcalPer100g} kcal per 100 g</p>
            : <p className="mt-1 text-xs text-[#9a5b45]">Mangler kaloridata.</p>}
        </div>
        <div>
          <Label htmlFor="qty">Mengde</Label>
          <div className="flex gap-2">
            <Input
              id="qty"
              type="number"
              inputMode="decimal"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              placeholder={unit === "g" ? "150" : unit === "dl" ? "2" : "1"}
              autoFocus
              className="flex-1"
            />
            <div className="flex rounded-xl border border-[var(--border)] overflow-hidden shrink-0">
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
                  {UNIT_LABEL[u]}
                </button>
              ))}
            </div>
          </div>
        </div>
        {kcalPreview != null && (
          <p className="text-sm font-semibold text-[var(--accent)]">≈ {kcalPreview} kcal</p>
        )}
        {addError && <p className="text-xs text-[var(--red)]">{addError}</p>}
        <Button type="button" className="w-full" disabled={pending || !selected.kcalPer100g || !quantityInput} onClick={handleAdd}>
          {pending ? "Legger til..." : "Legg til"}
        </Button>
      </div>
    );
  }

  // ---------- Scan wizard ----------
  if (showWizard) {
    return (
      <div className="app-content">
        <FoodScanWizard
          initialEan={photoInitialEan}
          onSaved={selectProduct}
          onUseExisting={selectProduct}
          onCancel={() => { setPhotoInitialEan(undefined); setShowWizard(false); }}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 mb-3 border-b border-[var(--color-border)] bg-[var(--bg)]">
        <div className="mb-2 flex items-center gap-2">
          <button type="button" onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold">{MEAL_LABELS[mealType]}</h1>
        </div>

        {/* Tabs */}
        <div className="flex">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" aria-label={label} onClick={() => switchTab(id)}
              className={cn(
                "flex flex-1 items-center justify-center py-2.5 transition-colors",
                tab === id
                  ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "text-[var(--color-muted-foreground)]",
              )}>
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>

      {/* Content — page scrolls naturally, app-shell padding-bottom clears bottom nav */}
      <div>

        {/* ---- SEARCH ---- */}
        {tab === "search" && (
          <div className="space-y-3">
            <Input
              id="food-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Søk matvare…"
              autoComplete="off"
              enterKeyHint="search"
            />

            {/* Recent history — shown when no query */}
            {query.trim().length < 2 && recentItems.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  Nylig brukt
                </p>
                <ul>
                  {recentItems.map((item) => (
                    <li key={item.productName} className="flex items-center gap-3 border-b border-[var(--color-border)] py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.productName}</p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          {Math.round(item.caloriesKcal)} kcal · {Math.round(item.quantityGrams)} g
                          {item.brand ? ` · ${item.brand}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleReAdd(item)}
                        disabled={addingRecentName === item.productName}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)] text-lg font-light text-[var(--color-primary)]"
                      >
                        {addingRecentName === item.productName ? "…" : "+"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Search results */}
            {query.trim().length >= 2 && (
              <>
                {searchError && <p className="text-xs text-[#9a5b45]">{searchError}</p>}
                {results.length === 0 && !searchError && (
                  <p className="text-xs text-[var(--color-muted-foreground)]">Ingen resultater.</p>
                )}
                <ul className="space-y-px">
                  {groupResults(results).map((group) => (
                    <li key={group.title}>
                      <p className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                        {group.title}
                      </p>
                      <ul>
                        {group.items.map((p) => (
                          <li key={`${p.source}-${p.externalId}`}>
                            <button
                              type="button"
                              onClick={() => selectProduct(p)}
                              className="flex w-full items-center gap-3 border-b border-[var(--color-border)] py-2.5 text-left hover:bg-[var(--color-muted)]"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{p.name}</span>
                                <span className="block truncate text-xs text-[var(--color-muted-foreground)]">
                                  {p.brand ?? sourceLabel(p)}{p.kcalPer100g != null ? ` · ${p.kcalPer100g} kcal/100g` : ""}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {/* ---- SCAN ---- */}
        {tab === "scan" && (
          <div className="space-y-3">
            <BarcodeScanner
              stream={cameraStream}
              onDetected={lookupEan}
              onError={(msg) => setEanError(msg)}
              onRetry={() => switchTab("scan")}
            />
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
                value={eanInput}
                onChange={(e) => setEanInput(e.target.value)}
                placeholder="EAN-kode"
                className="flex-1"
                enterKeyHint="go"
                onKeyDown={(e) => { if (e.key === "Enter") void lookupEan(eanInput); }}
              />
              <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={() => lookupEan(eanInput)}>OK</Button>
            </div>
            {eanError && (
              <div className="space-y-2">
                <p className="text-xs text-[#9a5b45]">{eanError}</p>
                {eanNotFound && (
                  <Button type="button" variant="secondary" size="sm" className="w-full"
                    onClick={() => { setPhotoInitialEan(eanInput.replace(/\D/g, "") || undefined); setEanNotFound(false); setEanError(null); setShowWizard(true); }}>
                    Legg til selv med bilde →
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---- QUICK ADD ---- */}
        {tab === "quick" && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Registrer raskt uten å søke opp produkt.
            </p>
            <div>
              <Label htmlFor="quick-name">Navn (valgfritt)</Label>
              <Input
                id="quick-name"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                placeholder="f.eks. Havregrøt"
              />
            </div>
            <div>
              <Label htmlFor="quick-kcal">Kalorier (kcal)</Label>
              <Input
                id="quick-kcal"
                type="number"
                inputMode="numeric"
                value={quickKcal}
                onChange={(e) => setQuickKcal(e.target.value)}
                placeholder="350"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(); }}
              />
            </div>
            {quickError && <FieldError message={quickError} />}
            <Button
              type="button"
              className="w-full"
              disabled={pending || quickDone}
              onClick={handleQuickAdd}
            >
              {quickDone ? "✓ Lagt til" : pending ? "Legger til..." : "Legg til"}
            </Button>
          </div>
        )}

        {/* ---- SAVED MEALS ---- */}
        {tab === "saved" && (
          <div className="space-y-2">
            {!savedLoaded ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">Laster…</p>
            ) : savedError ? (
              <div className="space-y-2">
                <p className="text-sm text-[#9a5b45]">{savedError}</p>
                <button
                  type="button"
                  onClick={() => switchTab("saved")}
                  className="text-sm font-medium text-[var(--color-primary)]"
                >
                  Prøv igjen
                </button>
              </div>
            ) : savedMeals.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Ingen lagrede måltider ennå. Logg et måltid og trykk «+ Legg til som eget måltid».
              </p>
            ) : (
              savedMeals.map((meal) => (
                <button
                  key={meal.id}
                  type="button"
                  disabled={addingSavedId === meal.id}
                  onClick={() => handleAddSavedMeal(meal.id)}
                  className="flex w-full items-center justify-between gap-2 border-b border-[var(--color-border)] py-3 text-left"
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
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
