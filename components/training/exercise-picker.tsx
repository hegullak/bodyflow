"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Search, X } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  bodyPart: { slug: string; name: string } | null;
  targetMuscle: { slug: string; name: string } | null;
  equipment: string;
}

interface Props {
  programId: string;
  programName: string;
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
];

export function ExercisePicker({ programId, programName }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [results, setResults] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addedCount, setAddedCount] = useState(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query && !bodyPart) { setResults([]); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(search, 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, bodyPart]);

  async function search() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "40" });
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
    if (adding || addedIds.has(exercise.id)) return;
    setAdding(exercise.id);
    try {
      await fetch(`/api/training/programs/${programId}/exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId: exercise.id }),
      });
      setAddedIds((prev) => new Set([...prev, exercise.id]));
      setAddedCount((n) => n + 1);
      // reset the check after 2s so it can be re-added if needed
      setTimeout(() => {
        setAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(exercise.id);
          return next;
        });
      }, 2000);
    } finally {
      setAdding(null);
    }
  }

  function handleDone() {
    router.push(`/training/programs/${programId}`);
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Breadcrumb / top nav */}
      <div className="mb-1 flex items-center justify-between">
        <p className="text-sm text-[var(--text3)]">
          ← <span className="text-[var(--text2)]">{programName}</span>
        </p>
        <button
          onClick={handleDone}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--red)] hover:bg-[var(--red-light)]"
          title="Done"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Added count badge */}
      {addedCount > 0 && (
        <div className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--green-light)] px-3 py-2">
          <span className="text-sm text-[var(--green)]">
            {addedCount} øvelse{addedCount !== 1 ? "r" : ""} lagt til
          </span>
          <button
            onClick={handleDone}
            className="text-sm font-medium text-[var(--green)] underline-offset-2 hover:underline"
          >
            Ferdig
          </button>
        </div>
      )}

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

      {/* Body part filter */}
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

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--text3)]" />
        </div>
      ) : results.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--text3)]">
          {query || bodyPart ? "No exercises found." : "Start typing to search."}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {results.map((ex) => {
            const isAdded = addedIds.has(ex.id);
            const isAdding = adding === ex.id;
            return (
              <li key={ex.id}>
                <button
                  onClick={() => handleAdd(ex)}
                  disabled={isAdding}
                  className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] border px-4 py-2.5 text-left transition-colors disabled:opacity-60 ${
                    isAdded
                      ? "border-[var(--green)]/40 bg-[var(--green-light)]"
                      : "border-[var(--border)] bg-[var(--card)] active:bg-[var(--card2)]"
                  }`}
                >
                  <span className={`text-sm font-medium ${isAdded ? "text-[var(--green)]" : "text-[var(--text1)]"}`}>
                    {ex.name}
                  </span>
                  {isAdding ? (
                    <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin text-[var(--accent)]" />
                  ) : isAdded ? (
                    <Check className="ml-2 h-4 w-4 shrink-0 text-[var(--green)]" />
                  ) : (
                    <span className="ml-2 shrink-0 text-xs text-[var(--accent)]">+ Add</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
