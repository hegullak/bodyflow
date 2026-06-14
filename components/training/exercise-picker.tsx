"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";

interface Exercise {
  id: string;
  externalId: string;
  name: string;
  nameEn: string;
  bodyPart: { slug: string; name: string } | null;
  targetMuscle: { slug: string; name: string } | null;
  equipment: string;
}

interface Props {
  programId: string;
}

export function ExercisePicker({ programId }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [results, setResults] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(), 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, bodyPart]);

  async function search() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "30" });
      if (query) params.set("search", query);
      if (bodyPart) params.set("bodyPart", bodyPart);
      const res = await fetch(`/api/exercises?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(exercise: Exercise) {
    setAdding(exercise.id);
    try {
      await fetch(`/api/training/programs/${programId}/exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId: exercise.id }),
      });
      router.push(`/training/programs/${programId}`);
    } finally {
      setAdding(null);
    }
  }

  const BODY_PARTS = [
    { value: "", label: "Alle" },
    { value: "chest", label: "Bryst" },
    { value: "back", label: "Rygg" },
    { value: "shoulders", label: "Skuldre" },
    { value: "upper-arms", label: "Overarmer" },
    { value: "lower-arms", label: "Underarmer" },
    { value: "upper-legs", label: "Lår" },
    { value: "lower-legs", label: "Legg" },
    { value: "waist", label: "Mage/kjernen" },
    { value: "cardio", label: "Cardio" },
    { value: "neck", label: "Nakke" },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text3)]" />
        <input
          autoFocus
          placeholder="Søk etter øvelse…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] py-3 pl-10 pr-4 text-[var(--text1)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
        />
      </div>

      {/* Body part filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
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

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text3)]" />
        </div>
      ) : results.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--text3)]">
          {query || bodyPart ? "Ingen øvelser funnet." : "Begynn å skrive for å søke."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {results.map((ex) => (
            <li key={ex.id}>
              <button
                onClick={() => handleAdd(ex)}
                disabled={adding === ex.id}
                className="flex w-full items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-left active:bg-[var(--card2)] disabled:opacity-60"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--text1)]">{ex.name}</p>
                  <p className="truncate text-xs text-[var(--text3)]">
                    {[ex.bodyPart?.name, ex.targetMuscle?.name, ex.equipment]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {adding === ex.id ? (
                  <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin text-[var(--accent)]" />
                ) : (
                  <span className="ml-2 shrink-0 text-[var(--accent)] text-sm">+ Legg til</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
