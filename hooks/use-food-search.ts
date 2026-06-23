"use client";

import { useEffect, useState } from "react";
import type { FoodProductSummary } from "@/lib/foods/types";

export function useFoodSearch(query: string) {
  const [results, setResults] = useState<FoodProductSummary[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/foods/search?search=${encodeURIComponent(trimmed)}`);
        if (!res.ok) {
          setResults([]);
          setSearchError(res.status === 503 ? "Matvare-API er ikke konfigurert." : "Søk feilet.");
          return;
        }
        const json = (await res.json()) as { data: FoodProductSummary[] };
        setResults(json.data ?? []);
        setSearchError(null);
      } catch {
        setSearchError("Søk feilet.");
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return { results, setResults, searchError, setSearchError };
}
