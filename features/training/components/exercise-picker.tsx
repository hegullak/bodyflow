"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Dumbbell, Loader2, Search, SlidersHorizontal, Star, X } from "lucide-react";
import { addExerciseAction, getExerciseFavoriteIdsAction, toggleExerciseFavoriteAction } from "../actions";

interface Exercise {
  id: string;
  name: string;
  bodyPart: { slug: string; name: string } | null;
  targetMuscle: { slug: string; name: string } | null;
  equipment: string;
  imageUrl: string | null;
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
  const [showFilters, setShowFilters] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getExerciseFavoriteIdsAction().then((ids) => setFavoriteIds(new Set(ids)));
  }, []);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!query && !bodyPart) { setResults([]); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(search, 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, bodyPart]);

  async function handleAdd(exercise: Exercise) {
    if (adding || addedIds.has(exercise.id)) return;
    setAdding(exercise.id);
    try {
      await addExerciseAction(programId, exercise.id);
      setAddedIds((prev) => new Set([...prev, exercise.id]));
      setAddedCount((n) => n + 1);
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

  async function handleToggleFavorite(exerciseId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setTogglingFavorite(exerciseId);
    try {
      const result = await toggleExerciseFavoriteAction(exerciseId);
      if (result.ok) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (result.isFavorited) next.add(exerciseId);
          else next.delete(exerciseId);
          return next;
        });
      }
    } finally {
      setTogglingFavorite(null);
    }
  }

  function handleDone() {
    router.back();
  }

  const activeFilter = bodyPart !== "";

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

      {/* Search + filter button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text3)]" />
          <input
            autoFocus
            placeholder="Search exercises…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] py-2 pl-9 pr-3 text-sm text-[var(--text1)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border transition-colors ${
            showFilters || activeFilter
              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
              : "border-[var(--border)] bg-[var(--card)] text-[var(--text2)]"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilter && (
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--red)] text-[8px] font-bold text-white">
              1
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text3)]">Body part</p>
          <div className="flex flex-wrap gap-1.5">
            {BODY_PARTS.map((bp) => (
              <button
                key={bp.value}
                onClick={() => {
                  setBodyPart(bp.value);
                  setShowFilters(false);
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  bodyPart === bp.value
                    ? "bg-[var(--accent)] text-[var(--bg)]"
                    : "bg-[var(--bg)] text-[var(--text2)] hover:bg-[var(--card2)]"
                }`}
              >
                {bp.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active filter pill */}
      {activeFilter && !showFilters && (
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-[var(--accent)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--accent)]">
            {BODY_PARTS.find((b) => b.value === bodyPart)?.label}
          </span>
          <button
            onClick={() => setBodyPart("")}
            className="text-[var(--text3)] hover:text-[var(--text1)]"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

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
            const isFavorited = favoriteIds.has(ex.id);
            const isTogglingFav = togglingFavorite === ex.id;
            return (
              <li key={ex.id}>
                <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border transition-colors">
                  <button
                    onClick={() => handleAdd(ex)}
                    disabled={isAdding}
                    className={`flex flex-1 items-center gap-3 px-3 py-2 text-left transition-colors disabled:opacity-60 ${
                      isAdded
                        ? "border-r border-[var(--green)]/40 bg-[var(--green-light)]"
                        : "bg-[var(--card)] active:bg-[var(--card2)]"
                    }`}
                  >
                    <ExerciseThumb imageUrl={ex.imageUrl} name={ex.name} />
                    <span className={`flex-1 truncate text-sm font-medium ${isAdded ? "text-[var(--green)]" : "text-[var(--text1)]"}`}>
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
                  <button
                    onClick={(e) => handleToggleFavorite(ex.id, e)}
                    disabled={isTogglingFav}
                    className="shrink-0 rounded-full p-1 mr-1 text-[var(--text3)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)] transition-colors disabled:opacity-60"
                    title={isFavorited ? "Fjern fra favoritter" : "Legg til favoritter"}
                  >
                    {isTogglingFav ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Star className={`h-4 w-4 ${isFavorited ? "fill-[var(--accent)] text-[var(--accent)]" : ""}`} />
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ExerciseThumb({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  const [error, setError] = useState(false);

  if (!imageUrl || error) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--card2)]">
        <Dumbbell className="h-4 w-4 text-[var(--text3)]" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={name}
      loading="lazy"
      onError={() => setError(true)}
      className="h-10 w-10 shrink-0 rounded-[var(--radius-sm)] bg-[var(--card2)] object-cover"
    />
  );
}
