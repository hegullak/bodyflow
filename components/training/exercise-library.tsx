"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Loader2, Search } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  bodyPart: { slug: string; name: string } | null;
  targetMuscle: { slug: string; name: string } | null;
  equipment: string;
}

const BODY_PARTS = [
  { value: "", label: "All" },
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "shoulders", label: "Shoulders" },
  { value: "upper-arms", label: "Arms" },
  { value: "upper-legs", label: "Legs" },
  { value: "lower-legs", label: "Calves" },
  { value: "waist", label: "Core" },
  { value: "cardio", label: "Cardio" },
  { value: "neck", label: "Neck" },
];

export function ExerciseLibrary() {
  const [query, setQuery] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [results, setResults] = useState<Exercise[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOffset(0);
  }, [query, bodyPart]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(0), 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, bodyPart]);

  async function search(off: number) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "40", offset: String(off) });
      if (query) params.set("search", query);
      if (bodyPart) params.set("bodyPart", bodyPart);
      const res = await fetch(`/api/exercises?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (off === 0) {
          setResults(data.data ?? []);
        } else {
          setResults((prev) => [...prev, ...(data.data ?? [])]);
        }
        setTotal(data.total ?? 0);
        setOffset(off + (data.data?.length ?? 0));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text3)]" />
        <input
          autoFocus
          placeholder="Search exercises…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] py-2 pl-9 pr-3 text-sm text-[var(--text1)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
        />
      </div>

      {/* Body part filter — contained scroll, no bleed */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-1.5 pb-1" style={{ width: "max-content" }}>
          {BODY_PARTS.map((bp) => (
            <button
              key={bp.value}
              onClick={() => setBodyPart(bp.value)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                bodyPart === bp.value
                  ? "bg-[var(--accent)] text-[var(--bg)]"
                  : "bg-[var(--card)] text-[var(--text2)] hover:bg-[var(--card2)]"
              }`}
            >
              {bp.label}
            </button>
          ))}
        </div>
      </div>

      {loading && results.length === 0 ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--text3)]" />
        </div>
      ) : (
        <>
          <p className="text-xs text-[var(--text3)]">{total} exercises</p>
          <ul className="flex flex-col gap-1">
            {results.map((ex) => (
              <li key={ex.id}>
                <Link
                  href={`/training/exercises/${ex.id}`}
                  className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 active:bg-[var(--card2)]"
                >
                  <span className="truncate text-sm font-medium text-[var(--text1)]">{ex.name}</span>
                  <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-[var(--text3)]" />
                </Link>
              </li>
            ))}
          </ul>
          {results.length < total && (
            <button
              onClick={() => search(offset)}
              disabled={loading}
              className="mt-1 rounded-[var(--radius-sm)] border border-[var(--border)] py-2.5 text-sm text-[var(--text2)] hover:bg-[var(--card)] disabled:opacity-50"
            >
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Load more"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
