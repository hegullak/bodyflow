"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import type { FoodProductSummary } from "@/lib/foods/types";

interface Props {
  placeholder?: string;
  onSelect: (product: FoodProductSummary) => void;
}

export function FoodSearchInput({ placeholder = "Søk etter matvare…", onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodProductSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (timerRef.current) clearTimeout(timerRef.current);
    if (trimmed.length < 2) {
      timerRef.current = setTimeout(() => { setResults([]); setOpen(false); }, 0);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/foods/search?search=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const json = (await res.json()) as { data: FoodProductSummary[] };
          setResults(json.data ?? []);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  function select(product: FoodProductSummary) {
    setQuery("");
    setResults([]);
    setOpen(false);
    onSelect(product);
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5">
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--text3)]" />
        ) : (
          <Search className="h-4 w-4 shrink-0 text-[var(--text3)]" />
        )}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-[var(--text1)] placeholder:text-[var(--text3)] focus:outline-none"
        />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] shadow-lg">
          {results.map((p, i) => (
            <li key={i}>
              <button
                onClick={() => select(p)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-[var(--card2)] active:bg-[var(--card2)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text1)]">{p.name}</p>
                  {p.brand && <p className="truncate text-xs text-[var(--text3)]">{p.brand}</p>}
                </div>
                <span className="ml-3 shrink-0 text-xs text-[var(--text2)]">
                  {p.kcalPer100g != null ? `${Math.round(p.kcalPer100g)} kcal/100g` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
