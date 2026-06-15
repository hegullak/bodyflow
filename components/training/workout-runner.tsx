"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus } from "lucide-react";
import type { ActiveSession, CompletedSet, LastSetRow } from "@/lib/training/sessions";
import type { ProgramBlock, ProgramExerciseRow } from "@/lib/training/programs";

// ---------------------------------------------------------------------------
// Local state types
// ---------------------------------------------------------------------------

interface SetRow {
  weightKg: number;
  reps: number;
  completed: boolean;
}

type SetsMap = Map<string, SetRow[]>; // programExerciseId → rows

// ---------------------------------------------------------------------------
// Rest timer hook
// ---------------------------------------------------------------------------

function useRestTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback((duration: number) => {
    if (interval.current) clearInterval(interval.current);
    setSeconds(duration);
    setRunning(true);
  }, []);

  const pause = useCallback(() => setRunning((v) => !v), []);
  const skip = useCallback(() => { setRunning(false); setSeconds(0); }, []);
  const add = useCallback((n: number) => setSeconds((v) => Math.max(0, v + n)), []);

  useEffect(() => {
    if (!running) { if (interval.current) clearInterval(interval.current); return; }
    interval.current = setInterval(() => {
      setSeconds((v) => { if (v <= 1) { setRunning(false); return 0; } return v - 1; });
    }, 1000);
    return () => { if (interval.current) clearInterval(interval.current); };
  }, [running]);

  return { seconds, running, active: running || seconds > 0, start, pause, skip, add };
}

// ---------------------------------------------------------------------------
// State initialisation
// ---------------------------------------------------------------------------

function initSets(
  blocks: ProgramBlock[],
  completedSets: CompletedSet[],
  lastSets: Record<string, LastSetRow[]>,
): SetsMap {
  const map = new Map<string, SetRow[]>();
  for (const block of blocks) {
    for (const ex of block.exercises) {
      const lastEx = lastSets[ex.id] ?? [];
      const rows: SetRow[] = [];
      for (let i = 0; i < ex.sets; i++) {
        const setNum = i + 1;
        const done = completedSets.find(
          (s) => s.programExerciseId === ex.id && s.setNumber === setNum,
        );
        const last = lastEx[i];
        rows.push({
          weightKg: done?.weightKg ?? last?.weightKg ?? 0,
          reps: done?.reps ?? last?.reps ?? ex.reps,
          completed: Boolean(done),
        });
      }
      map.set(ex.id, rows);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function WorkoutRunner({ session }: { session: ActiveSession }) {
  const router = useRouter();
  const timer = useRestTimer();
  const [setsMap, setSetsMap] = useState<SetsMap>(() =>
    initSets(session.blocks, session.completedSets, session.lastSets),
  );
  const [ending, setEnding] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t0 = new Date(session.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - t0) / 1000));
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [session.startedAt]);

  function rows(exId: string) { return setsMap.get(exId) ?? []; }

  function patchRow(exId: string, idx: number, patch: Partial<SetRow>) {
    setSetsMap((prev) => {
      const next = new Map(prev);
      const r = [...(next.get(exId) ?? [])];
      r[idx] = { ...r[idx], ...patch };
      next.set(exId, r);
      return next;
    });
  }

  function addRow(exId: string) {
    setSetsMap((prev) => {
      const next = new Map(prev);
      const r = [...(next.get(exId) ?? [])];
      const last = r[r.length - 1];
      r.push({ weightKg: last?.weightKg ?? 0, reps: last?.reps ?? 8, completed: false });
      next.set(exId, r);
      return next;
    });
  }

  async function toggleSet(ex: ProgramExerciseRow, idx: number, block: ProgramBlock) {
    const r = rows(ex.id)[idx];
    if (!r) return;
    const setNumber = idx + 1;

    if (r.completed) {
      patchRow(ex.id, idx, { completed: false });
      await fetch(`/api/training/sessions/${session.id}/sets`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programExerciseId: ex.id, setNumber }),
      });
      return;
    }

    patchRow(ex.id, idx, { completed: true });
    await fetch(`/api/training/sessions/${session.id}/sets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        programExerciseId: ex.id,
        setNumber,
        weightKg: ex.isBodyweight ? null : r.weightKg,
        reps: r.reps,
      }),
    });

    // Start rest timer — for supersets, only when all exercises in the block have set N done
    if (block.type === "superset") {
      const updatedMap = new Map(setsMap);
      const updatedRows = [...(updatedMap.get(ex.id) ?? [])];
      updatedRows[idx] = { ...updatedRows[idx], completed: true };
      updatedMap.set(ex.id, updatedRows);
      const allDone = block.exercises.every((bex) => updatedMap.get(bex.id)?.[idx]?.completed);
      if (allDone) timer.start(ex.restSeconds);
    } else {
      timer.start(ex.restSeconds);
    }
  }

  async function handleEnd() {
    if (!confirm("End workout?")) return;
    setEnding(true);
    await fetch(`/api/training/sessions/${session.id}`, { method: "PUT" });
    router.push("/training/history");
  }

  return (
    <div className="flex flex-col gap-3 pb-44">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[var(--text1)]">{session.programName}</h1>
          <p className="text-xs text-[var(--text3)]">{fmtElapsed(elapsed)}</p>
        </div>
        <button
          onClick={handleEnd}
          disabled={ending}
          className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm text-[var(--text2)] hover:bg-[var(--card2)] disabled:opacity-50"
        >
          End workout
        </button>
      </div>

      {/* Blocks */}
      {session.blocks.map((block) => (
        <div key={`${block.programOrder}-${block.supersetId ?? "solo"}`} className="flex flex-col gap-2">
          {block.type === "superset" && (
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
              Superset
            </p>
          )}
          {block.exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              ex={ex}
              setRows={rows(ex.id)}
              lastSets={session.lastSets[ex.id] ?? []}
              onToggle={(idx) => toggleSet(ex, idx, block)}
              onWeight={(idx, v) => patchRow(ex.id, idx, { weightKg: v })}
              onReps={(idx, v) => patchRow(ex.id, idx, { reps: v })}
              onAddSet={() => addRow(ex.id)}
            />
          ))}
        </div>
      ))}

      {session.blocks.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--text3)]">This program has no exercises.</p>
      )}

      {/* Rest timer — fixed above bottom nav */}
      {timer.active && (
        <RestTimerBar
          seconds={timer.seconds}
          running={timer.running}
          onAdd={timer.add}
          onPause={timer.pause}
          onSkip={timer.skip}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exercise card
// ---------------------------------------------------------------------------

interface ExerciseCardProps {
  ex: ProgramExerciseRow;
  setRows: SetRow[];
  lastSets: LastSetRow[];
  onToggle: (idx: number) => void;
  onWeight: (idx: number, v: number) => void;
  onReps: (idx: number, v: number) => void;
  onAddSet: () => void;
}

function ExerciseCard({ ex, setRows, lastSets, onToggle, onWeight, onReps, onAddSet }: ExerciseCardProps) {
  const name = ex.exerciseName;
  const meta = [ex.categoryName, ex.targetMuscleName].filter(Boolean).join(" · ");

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)]">
      {/* Exercise name */}
      <div className="px-4 py-3">
        <p className="font-semibold text-[var(--text1)]">{name}</p>
        {meta && <p className="text-xs text-[var(--text3)]">{meta} · {ex.equipment}</p>}
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[2.5rem_1fr_3.75rem_3.25rem_2.75rem] items-center border-t border-[var(--border)] px-4 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
        <span>Set</span>
        <span>Last</span>
        <span className="text-right">{ex.isBodyweight ? "Type" : "kg"}</span>
        <span className="text-right">Reps</span>
        <span />
      </div>

      {/* Set rows */}
      {setRows.map((row, idx) => (
        <SetRowItem
          key={idx}
          idx={idx}
          row={row}
          last={lastSets[idx] ?? null}
          isBodyweight={ex.isBodyweight}
          onToggle={() => onToggle(idx)}
          onWeight={(v) => onWeight(idx, v)}
          onReps={(v) => onReps(idx, v)}
        />
      ))}

      {/* Add set */}
      <button
        onClick={onAddSet}
        className="flex w-full items-center gap-2 border-t border-[var(--border)] px-4 py-2.5 text-sm text-[var(--accent)] hover:bg-[var(--card2)]"
      >
        <Plus className="h-3.5 w-3.5" />
        Add set
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Set row
// ---------------------------------------------------------------------------

interface SetRowItemProps {
  idx: number;
  row: SetRow;
  last: LastSetRow | null;
  isBodyweight: boolean;
  onToggle: () => void;
  onWeight: (v: number) => void;
  onReps: (v: number) => void;
}

function SetRowItem({ idx, row, last, isBodyweight, onToggle, onWeight, onReps }: SetRowItemProps) {
  return (
    <div
      className={`grid grid-cols-[2.5rem_1fr_3.75rem_3.25rem_2.75rem] items-center border-t border-[var(--border)] px-4 py-2 transition-colors ${
        row.completed ? "bg-[var(--green-light)]" : ""
      }`}
    >
      {/* Set number */}
      <span className={`text-sm font-semibold ${row.completed ? "text-[var(--green)]" : "text-[var(--text3)]"}`}>
        {idx + 1}
      </span>

      {/* Last */}
      <div className="min-w-0">
        {last ? (
          <>
            <p className={`text-xs font-medium ${row.completed ? "text-[var(--green)]/70" : "text-[var(--text2)]"}`}>
              {last.weightKg != null ? `${last.weightKg}` : "BW"}×{last.reps ?? "—"}
            </p>
            <p className="text-[10px] text-[var(--text3)]">{fmtDate(last.completedAt)}</p>
          </>
        ) : (
          <p className="text-xs text-[var(--text3)]">—</p>
        )}
      </div>

      {/* KG / bodyweight */}
      {isBodyweight ? (
        <p className={`text-right text-xs font-medium ${row.completed ? "text-[var(--green)]/70" : "text-[var(--text3)]"}`}>
          BW
        </p>
      ) : (
        <input
          type="number"
          inputMode="decimal"
          value={row.weightKg || ""}
          placeholder="0"
          onChange={(e) => onWeight(parseFloat(e.target.value) || 0)}
          className={`w-full rounded bg-transparent text-right text-sm font-medium outline-none focus:rounded focus:ring-1 focus:ring-[var(--accent)]/50 ${
            row.completed ? "text-[var(--green)]" : "text-[var(--text1)]"
          }`}
        />
      )}

      {/* Reps */}
      <input
        type="number"
        inputMode="numeric"
        value={row.reps || ""}
        placeholder="0"
        onChange={(e) => onReps(parseInt(e.target.value) || 0)}
        className={`w-full rounded bg-transparent text-right text-sm font-medium outline-none focus:rounded focus:ring-1 focus:ring-[var(--accent)]/50 ${
          row.completed ? "text-[var(--green)]" : "text-[var(--text1)]"
        }`}
      />

      {/* Complete button */}
      <div className="flex justify-end">
        <button
          onClick={onToggle}
          className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
            row.completed
              ? "border-[var(--green)] bg-[var(--green)] text-white"
              : "border-[var(--text3)] text-[var(--text3)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          }`}
        >
          <Check className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rest timer bar
// ---------------------------------------------------------------------------

interface RestTimerBarProps {
  seconds: number;
  running: boolean;
  onAdd: (n: number) => void;
  onPause: () => void;
  onSkip: () => void;
}

function RestTimerBar({ seconds, running, onAdd, onPause, onSkip }: RestTimerBarProps) {
  return (
    <div className="fixed bottom-[5.5rem] left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]/95 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-3 px-5 py-3">
        {/* −15s */}
        <button
          onClick={() => onAdd(-15)}
          className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full border border-[var(--border)] text-[var(--text2)] hover:bg-[var(--card2)]"
        >
          <Minus className="h-3.5 w-3.5" />
          <span className="text-[9px]">15s</span>
        </button>

        {/* Central countdown — tapping pauses/resumes */}
        <button
          onClick={onPause}
          className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-[var(--accent)] py-2.5"
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--bg)]/60">
            Rest
          </span>
          <span className="text-3xl font-bold tabular-nums leading-none text-[var(--bg)]">
            {fmtTimer(seconds)}
          </span>
          {!running && (
            <span className="text-[9px] text-[var(--bg)]/60">tap to resume</span>
          )}
        </button>

        {/* +15s */}
        <button
          onClick={() => onAdd(15)}
          className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full border border-[var(--border)] text-[var(--text2)] hover:bg-[var(--card2)]"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="text-[9px]">15s</span>
        </button>
      </div>

      {/* Skip */}
      <button
        onClick={onSkip}
        className="w-full border-t border-[var(--border)] py-2 text-sm font-medium text-[var(--text2)] hover:bg-[var(--card2)]"
      >
        Skip rest
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtTimer(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function fmtElapsed(s: number) {
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(d));
}
