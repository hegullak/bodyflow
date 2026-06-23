"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, ScanBarcode, Search, Star, Zap } from "lucide-react";
import type { MealType } from "@/db/schema";
import { addMealItemAction, quickAddMealItemAction, getRecentMealItemsAction, type RecentMealItem } from "@/lib/actions/meals";
import { addSavedMealToLogAction, getSavedMealsAction } from "@/lib/actions/saved-meals";
import { ensureAndToggleFavoriteAction, toggleFavoriteAction } from "@/lib/actions/foods";
import type { FoodProductSummary } from "@/lib/foods/types";
import { type Unit, UNITS, UNIT_LABEL, toGrams, convertUnit } from "@/lib/foods/units";
import { sourceLabel, groupResults } from "@/lib/foods/source";
import { calculateCaloriesFromGrams } from "@/lib/kassal/nutrition";
import { BarcodeScanner, cameraErrorMessage, requestCameraStream } from "@/components/meals/barcode-scanner";
import { FoodScanWizard } from "@/components/meals/food-scan-wizard";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { cn, addDaysToIsoDate, todayIsoDate } from "@/lib/utils";
import { useT } from "@/components/providers/lang-provider";
import { useFoodSearch } from "@/hooks/use-food-search";
import { useFavorites } from "@/hooks/use-favorites";

type Tab = "search" | "favorites" | "scan" | "quick" | "saved";

function buildDateOptions(weekdayNames: string[], todayLabel: string) {
  const today = todayIsoDate();
  return [0, 1, 2, 3, 4].map((offset) => {
    const iso = addDaysToIsoDate(today, offset);
    let label: string;
    if (offset === 0) {
      label = todayLabel;
    } else {
      const d = new Date(iso + "T00:00:00");
      // getDay: 0=Sun,1=Mon,...,6=Sat → weekdayNames is Mon..Sun (index 0..6)
      const idx = (d.getDay() + 6) % 7;
      label = `${weekdayNames[idx]!.slice(0, 3)} ${d.getDate()}`;
    }
    return { iso, label };
  });
}

export function MealAddView({ logDate, mealType }: { logDate: string; mealType: MealType }) {
  const t = useT();
  const m = t.meals;
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("search");

  // Date selection (today + next 4 days) — can select multiple
  const [selectedDates, setSelectedDates] = useState<Set<string>>(() => new Set([logDate]));

  // Search
  const [query, setQuery] = useState("");
  const { results, setResults, searchError } = useFoodSearch(query);
  const { favoriteIds, favoriteProducts, favoritesLoaded, loadFavoriteIds, loadFavorites, applyToggleResult } = useFavorites();

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
    void loadFavoriteIds();
  }, [recentLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopCamera = useCallback(() => {
    setCameraStream((s) => { s?.getTracks().forEach((t) => t.stop()); return null; });
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  async function handleToggleFavorite(product: FoodProductSummary, e: React.MouseEvent) {
    e.stopPropagation();
    if (product.id) {
      const result = await toggleFavoriteAction(product.id);
      if (!result.ok) return;
      applyToggleResult(product.id, result.isFavorited, product);
    } else {
      // Kassal product not yet in local DB — upsert first, then favorite
      const result = await ensureAndToggleFavoriteAction(product);
      if (!result.ok) return;
      // Patch id everywhere so re-clicking and star state work correctly
      setResults((prev) =>
        prev.map((p) =>
          p.source === product.source && p.externalId === product.externalId
            ? { ...p, id: result.localId }
            : p,
        ),
      );
      setSelected((prev) =>
        prev?.source === product.source && prev.externalId === product.externalId
          ? { ...prev, id: result.localId }
          : prev,
      );
      applyToggleResult(result.localId, result.isFavorited, { ...product, id: result.localId });
    }
  }

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
      if (res.ok) setSavedMeals(res.data);
      else setSavedError("Henting feilet — prøv igjen.");
      setSavedLoaded(true);
    }
    if (t === "favorites") void loadFavorites();
  }

  function selectProduct(p: FoodProductSummary) {
    setSelected(p);
    setAddError(null);
    setUnit("g");
    if (p.packageGrams) setQuantityInput(String(Math.round(p.packageGrams)));
    else setQuantityInput("");
  }

  function toggleSelectedDate(iso: string) {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  }

  function changeUnit(next: Unit) {
    const current = Number(quantityInput);
    if (Number.isFinite(current) && current > 0) {
      setQuantityInput(String(convertUnit(current, unit, next)));
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
    if (selectedDates.size === 0) { setAddError("Velg minst en dag."); return; }

    startTransition(async () => {
      // Add to each selected date
      const dates = Array.from(selectedDates).sort();
      for (const logDate of dates) {
        const fd = new FormData();
        fd.set("logDate", logDate);
        fd.set("mealType", mealType);
        if (selected.id) fd.set("foodProductId", selected.id);
        fd.set("source", selected.source);
        fd.set("externalId", selected.externalId);
        if (selected.ean) fd.set("ean", selected.ean);
        fd.set("quantityGrams", String(grams));
        const result = await addMealItemAction(null, fd);
        if (!result.ok) {
          setAddError(result.error ?? null);
          return;
        }
      }
      router.back();
    });
  }

  function handleQuickAdd() {
    const kcal = Number(quickKcal);
    if (!kcal || kcal <= 0) { setQuickError("Skriv inn kalorier."); return; }
    if (selectedDates.size === 0) { setQuickError("Velg minst en dag."); return; }

    startTransition(async () => {
      const dates = Array.from(selectedDates).sort();
      for (const logDate of dates) {
        const result = await quickAddMealItemAction(logDate, mealType, quickName, kcal);
        if (!result.ok) {
          setQuickError(result.error ?? null);
          return;
        }
      }
      setQuickDone(true);
      setQuickName(""); setQuickKcal(""); setQuickError(null);
      setTimeout(() => { setQuickDone(false); router.back(); }, 600);
    });
  }

  async function handleAddSavedMeal(id: string) {
    if (selectedDates.size === 0) return;
    setAddingSavedId(id);
    const dates = Array.from(selectedDates).sort();
    for (const logDate of dates) {
      const result = await addSavedMealToLogAction(id, logDate, mealType);
      if (!result.ok) {
        setAddingSavedId(null);
        return;
      }
    }
    setAddingSavedId(null);
    router.back();
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof Search }> = [
    { id: "search",    label: m.search,         icon: Search },
    { id: "favorites", label: m.favorites,      icon: Star },
    { id: "scan",      label: m.scanBarcode,    icon: ScanBarcode },
    { id: "quick",     label: m.quickAdd,       icon: Zap },
    { id: "saved",     label: m.savedMeals,     icon: BookOpen },
  ];

  // ---------- Selected product confirm ----------
  if (selected) {
    return (
      <div className="app-content space-y-4">
        <button type="button" onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-[var(--color-muted-foreground)]">
          <ArrowLeft className="h-4 w-4" /> {t.common.back}
        </button>
        <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{selected.prettyName ?? selected.name}</p>
            {selected.prettyName && (
              <p className="text-xs text-[var(--color-muted-foreground)]">{selected.name}</p>
            )}
            <p className="text-xs text-[var(--color-muted-foreground)]">{sourceLabel(selected)}</p>
            {selected.kcalPer100g != null
              ? <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{selected.kcalPer100g} kcal per 100 g</p>
              : <p className="mt-1 text-xs text-[#9a5b45]">{m.missingCalorieData}</p>}
          </div>
          <button
            type="button"
            aria-label={selected.id && favoriteIds.has(selected.id) ? m.removeFavorite : m.addFavorite}
            onClick={(e) => handleToggleFavorite(selected, e)}
            className="shrink-0 p-1"
          >
            <Star className={cn("h-6 w-6 transition-colors",
              selected.id && favoriteIds.has(selected.id)
                ? "fill-[var(--amber)] text-[var(--amber)]"
                : selected.id
                  ? "text-[var(--color-muted-foreground)]"
                  : "text-[var(--color-muted-foreground)] opacity-30"
            )} />
          </button>
        </div>
        <div>
          <Label htmlFor="qty">{m.quantity}</Label>
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
        {/* Date picker — today + next 4 days (multi-select) */}
        <div>
          <Label className="mb-2 block">{m.selectDays}</Label>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {buildDateOptions(t.profile.weekdayNames, m.today).map(({ iso, label }) => (
              <button
                key={iso}
                type="button"
                onClick={() => toggleSelectedDate(iso)}
                className={cn(
                  "flex-shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  selectedDates.has(iso)
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--card)]"
                    : "border-[var(--border)] text-[var(--text2)]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {addError && <p className="text-xs text-[var(--red)]">{addError}</p>}
        <Button type="button" className="w-full" disabled={pending || !selected.kcalPer100g || !quantityInput} onClick={handleAdd}>
          {pending ? m.addingItem : m.addToMeal}
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
          <h1 className="text-base font-semibold">{m.mealLabel(mealType)}</h1>
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
              placeholder={m.searchPlaceholder}
              autoComplete="off"
              enterKeyHint="search"
            />

            {/* Recent history — shown when no query */}
            {query.trim().length < 2 && recentItems.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  {m.recentlyUsed}
                </p>
                <ul>
                  {recentItems.map((item) => (
                    <li key={item.productName} className="flex items-center border-b border-[var(--color-border)] py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.productName}</p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          {Math.round(item.caloriesKcal)} kcal · {Math.round(item.quantityGrams)} g
                          {item.brand ? ` · ${item.brand}` : ""}
                        </p>
                      </div>
                      {item.foodProductId && (
                        <button
                          type="button"
                          aria-label={favoriteIds.has(item.foodProductId) ? m.removeFavorite : m.addFavorite}
                          onClick={async (e) => {
                            e.stopPropagation();
                            const result = await toggleFavoriteAction(item.foodProductId!);
                            if (!result.ok) return;
                            applyToggleResult(item.foodProductId!, result.isFavorited);
                          }}
                          className="shrink-0 px-2 py-1"
                        >
                          <Star className={cn("h-5 w-5 transition-colors",
                            favoriteIds.has(item.foodProductId)
                              ? "fill-[var(--amber)] text-[var(--amber)]"
                              : "text-[var(--color-muted-foreground)]"
                          )} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          // Convert recent item to FoodProductSummary and show quantity input
                          const productSummary: FoodProductSummary = {
                            id: item.foodProductId,
                            source: "custom",
                            externalId: item.productName,
                            name: item.productName,
                            prettyName: item.productName,
                            brand: item.brand || null,
                            kcalPer100g: Math.round((item.caloriesKcal / item.quantityGrams) * 100),
                            packageGrams: item.quantityGrams,
                            ean: null,
                            image: null,
                          };
                          selectProduct(productSummary);
                        }}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)] text-lg font-light text-[var(--color-primary)]"
                      >
                        +
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
                  <p className="text-xs text-[var(--color-muted-foreground)]">{m.noSearchResults}</p>
                )}
                <ul className="space-y-px">
                  {groupResults(results).map((group) => (
                    <li key={group.title}>
                      <p className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                        {group.title}
                      </p>
                      <ul>
                        {group.items.map((p) => (
                          <li key={`${p.source}-${p.externalId}`} className="flex items-center border-b border-[var(--color-border)]">
                            <button
                              type="button"
                              onClick={() => selectProduct(p)}
                              className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left hover:bg-[var(--color-muted)]"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{p.prettyName ?? p.name}</span>
                                {p.prettyName && (
                                  <span className="block truncate text-xs text-[var(--color-muted-foreground)] opacity-60">{p.name}</span>
                                )}
                                <span className="block truncate text-xs text-[var(--color-muted-foreground)]">
                                  {p.brand ?? sourceLabel(p)}{p.kcalPer100g != null ? ` · ${p.kcalPer100g} kcal/100g` : ""}
                                </span>
                              </span>
                            </button>
                            <button
                              type="button"
                              aria-label={p.id && favoriteIds.has(p.id) ? m.removeFavorite : m.addFavorite}
                              onClick={(e) => handleToggleFavorite(p, e)}
                              className="shrink-0 px-3 py-2.5 hover:bg-[var(--color-muted)]"
                            >
                              <Star className={cn("h-5 w-5 transition-colors",
                                p.id && favoriteIds.has(p.id)
                                  ? "fill-[var(--amber)] text-[var(--amber)]"
                                  : p.id
                                    ? "text-[var(--color-muted-foreground)]"
                                    : "text-[var(--color-muted-foreground)] opacity-30"
                              )} />
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

        {/* ---- FAVORITES ---- */}
        {tab === "favorites" && (
          <div className="space-y-1">
            {!favoritesLoaded ? (
              <p className="text-xs text-[var(--color-muted-foreground)]">{t.common.loading}</p>
            ) : favoriteProducts.length === 0 ? (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {m.favoritesFallback}
              </p>
            ) : (
              <ul>
                {favoriteProducts.map((p) => (
                  <li key={`fav-${p.id}`} className="flex items-center border-b border-[var(--color-border)]">
                    <button
                      type="button"
                      onClick={() => selectProduct(p)}
                      className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left hover:bg-[var(--color-muted)]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.prettyName ?? p.name}</span>
                        {p.prettyName && (
                          <span className="block truncate text-xs text-[var(--color-muted-foreground)] opacity-60">{p.name}</span>
                        )}
                        <span className="block truncate text-xs text-[var(--color-muted-foreground)]">
                          {p.brand ?? sourceLabel(p)}{p.kcalPer100g != null ? ` · ${p.kcalPer100g} kcal/100g` : ""}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={m.removeFavorite}
                      onClick={(e) => handleToggleFavorite(p, e)}
                      className="shrink-0 px-3 py-2.5 hover:bg-[var(--color-muted)]"
                    >
                      <Star className="h-5 w-5 fill-[var(--amber)] text-[var(--amber)] transition-colors" />
                    </button>
                  </li>
                ))}
              </ul>
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
                    {m.addWithPhoto}
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
              {m.quickAddDesc}
            </p>
            <div>
              <Label htmlFor="quick-name">{m.nameOptional}</Label>
              <Input
                id="quick-name"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                placeholder="f.eks. Havregrøt"
              />
            </div>
            <div>
              <Label htmlFor="quick-kcal">{m.caloriesKcal}</Label>
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
              {quickDone ? m.added : pending ? m.addingItem : m.addItem}
            </Button>
          </div>
        )}

        {/* ---- SAVED MEALS ---- */}
        {tab === "saved" && (
          <div className="space-y-2">
            {!savedLoaded ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">{t.common.loading}</p>
            ) : savedError ? (
              <div className="space-y-2">
                <p className="text-sm text-[#9a5b45]">{savedError}</p>
                <button
                  type="button"
                  onClick={() => switchTab("saved")}
                  className="text-sm font-medium text-[var(--color-primary)]"
                >
                  {t.common.retry}
                </button>
              </div>
            ) : savedMeals.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {m.noSavedMeals}
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
                    {addingSavedId === meal.id ? "..." : `+ ${m.addItem}`}
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
