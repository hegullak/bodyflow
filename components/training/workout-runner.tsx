"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Dumbbell, Link2, Minus, Play, Plus, Trash2, X } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ActiveSession, CompletedSet, LastSetRow } from "@/lib/training/sessions";
import type { ProgramBlock, ProgramExerciseRow } from "@/lib/training/programs";
import { useT } from "@/components/providers/lang-provider";

// ---------------------------------------------------------------------------
// Local state types
// ---------------------------------------------------------------------------

interface SetRow {
  weightKg: number;
  reps: number;
  completed: boolean;
}

type SetsMap = Map<string, SetRow[]>;

interface ActiveInput {
  exId: string;
  setIdx: number;
  field: "weight" | "reps";
  value: string;
  selected: boolean; // if true, next key press replaces the entire value
}

// ---------------------------------------------------------------------------
// Rest timer hook
// ---------------------------------------------------------------------------

// Wall-clock driven timer — immune to React render timing and setInterval drift.
// All mutable state lives in refs; React state is only updated for display.
function useRestTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  // Single ref bundle — no stale-closure risk regardless of how callers cache these fns.
  const r = useRef({
    endAt: null as number | null, // wall-clock ms when rest ends
    running: false,
    seconds: 0,
    interval: null as ReturnType<typeof setInterval> | null,
  });

  const fns = useRef({
    stopTick() {
      if (r.current.interval !== null) {
        clearInterval(r.current.interval);
        r.current.interval = null;
      }
    },
    startTick(endAt: number) {
      fns.current.stopTick();
      r.current.interval = setInterval(() => {
        const rem = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
        r.current.seconds = rem;
        setSeconds(rem);
        if (rem <= 0) {
          fns.current.stopTick();
          r.current.endAt = null;
          r.current.running = false;
          setRunning(false);
        }
      }, 250);
    },
    start(duration: number) {
      const endAt = Date.now() + duration * 1000;
      r.current.endAt = endAt;
      r.current.seconds = duration;
      r.current.running = true;
      setSeconds(duration);
      setRunning(true);
      fns.current.startTick(endAt);
    },
    pause() {
      if (r.current.running) {
        fns.current.stopTick();
        r.current.endAt = null;
        r.current.running = false;
        setRunning(false);
        // seconds display stays at whatever the last tick showed
      } else {
        const s = r.current.seconds;
        if (s > 0) {
          const endAt = Date.now() + s * 1000;
          r.current.endAt = endAt;
          r.current.running = true;
          setRunning(true);
          fns.current.startTick(endAt);
        }
      }
    },
    skip() {
      fns.current.stopTick();
      r.current.endAt = null;
      r.current.running = false;
      r.current.seconds = 0;
      setRunning(false);
      setSeconds(0);
    },
    add(n: number) {
      if (r.current.endAt !== null) {
        r.current.endAt += n * 1000;
        const rem = Math.max(0, Math.ceil((r.current.endAt - Date.now()) / 1000));
        r.current.seconds = rem;
        setSeconds(rem);
        fns.current.startTick(r.current.endAt);
      } else {
        const newS = Math.max(0, r.current.seconds + n);
        r.current.seconds = newS;
        setSeconds(newS);
      }
    },
  });

  // Cleanup on unmount only
  useEffect(() => () => fns.current.stopTick(), []);

  const start = useCallback((duration: number) => fns.current.start(duration), []);
  const pause = useCallback(() => fns.current.pause(), []);
  const skip  = useCallback(() => fns.current.skip(), []);
  const add   = useCallback((n: number) => fns.current.add(n), []);

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

function blockDragId(block: ProgramBlock) {
  return block.exercises[0].id;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function WorkoutRunner({ session }: { session: ActiveSession }) {
  const t = useT();
  const router = useRouter();
  const timer = useRestTimer();
  const [blocks, setBlocks] = useState(session.blocks);
  const [setsMap, setSetsMap] = useState<SetsMap>(() =>
    initSets(session.blocks, session.completedSets, session.lastSets),
  );
  const [ending, setEnding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timerNextEx, setTimerNextEx] = useState<ProgramExerciseRow | null>(null);
  const [timerNextSetIdx, setTimerNextSetIdx] = useState<number | null>(null);
  const [restingSet, setRestingSet] = useState<{ exId: string; setIdx: number } | null>(null);
  const [supersetMap, setSupersetMap] = useState<Map<string, boolean>>(new Map());
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; name: string } | null>(null);
  const [activeInput, setActiveInput] = useState<ActiveInput | null>(null);
  const firstExRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  function setCardRef(exId: string, el: HTMLDivElement | null) {
    if (el) cardRefs.current.set(exId, el);
    else cardRefs.current.delete(exId);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!timer.active) setRestingSet(null);
  }, [timer.active]);

  // When rest timer finishes (timer.seconds === 0 and not running), auto-focus next set
  useEffect(() => {
    if (timer.seconds === 0 && !timer.running && restingSet) {
      const { exId, setIdx } = restingSet;
      const exRows = rows(exId);
      const nextSetInEx = exRows.findIndex((r, i) => i > setIdx && !r.completed);
      if (nextSetInEx !== -1) {
        // More sets in this exercise
        focusInput(exId, nextSetInEx, "weight");
      } else {
        // All sets done, focus next exercise
        const nextEx = findNextExercise(exId);
        if (nextEx) {
          focusInput(nextEx.id, 0, "weight");
        }
      }
    }
  }, [timer.seconds, timer.running]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  useEffect(() => {
    const t = setTimeout(() => firstExRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    return () => clearTimeout(t);
  }, []);

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

  async function removeRow(exId: string, idx: number) {
    const r = rows(exId)[idx];
    if (r?.completed) {
      await fetch(`/api/training/sessions/${session.id}/sets`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programExerciseId: exId, setNumber: idx + 1 }),
      });
    }
    setSetsMap((prev) => {
      const next = new Map(prev);
      const updated = [...(next.get(exId) ?? [])];
      updated.splice(idx, 1);
      next.set(exId, updated);
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

    // Check before patching (state not yet updated)
    const exRows = rows(ex.id);
    const willAllBeCompleted = exRows.every((row, i) => i === idx || row.completed);

    patchRow(ex.id, idx, { completed: true });
    cardRefs.current.get(ex.id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });

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

    // Set timer to show next incomplete set in this exercise, or next exercise if all sets are done
    const updatedExRows = rows(ex.id);
    const nextSetInEx = updatedExRows.findIndex((r, i) => i > idx && !r.completed);
    const isSupersetMode = supersetMap.get(ex.id) ?? false;

    if (nextSetInEx !== -1 && !isSupersetMode) {
      // More sets in this exercise, and not in superset mode
      setTimerNextEx(ex);
      setTimerNextSetIdx(nextSetInEx);
    } else if (isSupersetMode || nextSetInEx === -1) {
      // All sets done in this exercise, or superset mode — show next exercise at same set idx
      const all = blocks.flatMap((b) => b.exercises);
      const exIdx = all.findIndex((e) => e.id === ex.id);
      const nextEx = exIdx !== -1 && exIdx < all.length - 1 ? all[exIdx + 1] : null;
      setTimerNextEx(nextEx ?? null);
      setTimerNextSetIdx(isSupersetMode && nextEx ? idx : null);
    }

    if (block.type === "superset") {
      const updatedMap = new Map(setsMap);
      const updatedRows = [...(updatedMap.get(ex.id) ?? [])];
      updatedRows[idx] = { ...updatedRows[idx], completed: true };
      updatedMap.set(ex.id, updatedRows);
      const allDone = block.exercises.every((bex) => updatedMap.get(bex.id)?.[idx]?.completed);
      if (allDone) {
        setRestingSet({ exId: ex.id, setIdx: idx });
        timer.start(ex.restSeconds);
      }
    } else {
      setRestingSet({ exId: ex.id, setIdx: idx });
      timer.start(ex.restSeconds);
    }

    // Only auto-focus the next set if there's no rest timer (restSeconds = 0).
    // When resting, the user taps the set row manually when ready.
    if (ex.restSeconds === 0) {
      if (willAllBeCompleted) {
        const nextEx = findNextExercise(ex.id);
        if (nextEx) {
          setTimeout(() => focusInput(nextEx.id, 0, "weight"), 450);
        }
      } else {
        const nextSetIdx = exRows.findIndex((row, i) => i > idx && !row.completed);
        if (nextSetIdx !== -1) {
          setTimeout(() => focusInput(ex.id, nextSetIdx, "weight"), 450);
        }
      }
    }
  }

  // Find exercise + block by exerciseId
  function findExAndBlock(exId: string): { ex: ProgramExerciseRow; block: ProgramBlock } | null {
    for (const block of blocks) {
      const ex = block.exercises.find((e) => e.id === exId);
      if (ex) return { ex, block };
    }
    return null;
  }

  // Find the next exercise in flat order across all blocks
  function findNextExercise(exId: string): ProgramExerciseRow | null {
    const all = blocks.flatMap((b) => b.exercises);
    const i = all.findIndex((e) => e.id === exId);
    return i !== -1 && i < all.length - 1 ? all[i + 1] : null;
  }

  function removeExercise(exId: string) {
    setBlocks((prev) =>
      prev
        .map((b) => ({ ...b, exercises: b.exercises.filter((e) => e.id !== exId) }))
        .filter((b) => b.exercises.length > 0)
    );
  }

  function toggleSupersetMode(exId: string) {
    setSupersetMap((prev) => {
      const next = new Map(prev);
      next.set(exId, !next.get(exId));
      return next;
    });
  }

  // Custom keyboard handlers
  function focusInput(exId: string, setIdx: number, field: "weight" | "reps") {
    const row = rows(exId)[setIdx];
    if (!row) return;
    const value = field === "weight"
      ? (row.weightKg ? String(row.weightKg) : "")
      : (row.reps ? String(row.reps) : "");
    setActiveInput({ exId, setIdx, field, value, selected: true });
  }

  function handleKeyboardKey(key: string) {
    if (!activeInput) return;
    const { exId, setIdx, field, value, selected } = activeInput;
    let newVal: string;

    if (key === "⌫") {
      newVal = selected ? "" : value.slice(0, -1);
    } else if (key === "." && ((value.includes(".") && !selected) || field === "reps")) {
      setActiveInput({ ...activeInput, selected: false });
      return;
    } else {
      newVal = selected ? key : (value === "0" && key !== "." ? key : value + key);
    }

    const numVal = parseFloat(newVal) || 0;
    if (field === "weight") {
      patchRow(exId, setIdx, { weightKg: numVal });
    } else {
      patchRow(exId, setIdx, { reps: Math.round(parseFloat(newVal) || 0) });
    }
    setActiveInput({ ...activeInput, value: newVal, selected: false });
  }

  function handleKeyboardNext() {
    if (!activeInput) return;
    const { exId, setIdx, field } = activeInput;

    if (field === "weight") {
      focusInput(exId, setIdx, "reps");
    } else {
      const found = findExAndBlock(exId);
      if (found) {
        const row = rows(exId)[setIdx];
        if (row && !row.completed) {
          setActiveInput(null);
          toggleSet(found.ex, setIdx, found.block);
          // Auto-focus next set after completing this one
          setTimeout(() => {
            const exRows = rows(exId);
            const nextSetIdx = exRows.findIndex((r, i) => i > setIdx && !r.completed);
            if (nextSetIdx !== -1) {
              focusInput(exId, nextSetIdx, "weight");
            } else {
              const nextEx = findNextExercise(exId);
              if (nextEx) {
                focusInput(nextEx.id, 0, "weight");
              }
            }
          }, 100);
        }
      }
    }
  }

  function handleKeyboardPlus() {
    if (!activeInput) return;
    const { exId, setIdx, field } = activeInput;
    const row = rows(exId)[setIdx];
    if (!row) return;
    if (field === "weight") {
      const newVal = Math.round(((row.weightKg || 0) + 2.5) * 100) / 100;
      patchRow(exId, setIdx, { weightKg: newVal });
      setActiveInput({ ...activeInput, value: String(newVal), selected: true });
    } else {
      const newVal = (row.reps || 0) + 1;
      patchRow(exId, setIdx, { reps: newVal });
      setActiveInput({ ...activeInput, value: String(newVal), selected: true });
    }
  }

  function handleKeyboardMinus() {
    if (!activeInput) return;
    const { exId, setIdx, field } = activeInput;
    const row = rows(exId)[setIdx];
    if (!row) return;
    if (field === "weight") {
      const newVal = Math.max(0, Math.round(((row.weightKg || 0) - 2.5) * 100) / 100);
      patchRow(exId, setIdx, { weightKg: newVal });
      setActiveInput({ ...activeInput, value: String(newVal), selected: true });
    } else {
      const newVal = Math.max(0, (row.reps || 0) - 1);
      patchRow(exId, setIdx, { reps: newVal });
      setActiveInput({ ...activeInput, value: String(newVal), selected: true });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = blocks.findIndex((b) => blockDragId(b) === active.id);
    const newIdx = blocks.findIndex((b) => blockDragId(b) === over.id);
    if (oldIdx !== -1 && newIdx !== -1) setBlocks(arrayMove(blocks, oldIdx, newIdx));
  }

  async function handleEnd() {
    if (!confirm(t.workout.endWorkout)) return;
    setEnding(true);
    try {
      await fetch(`/api/training/sessions/${session.id}`, { method: "PUT" });
      router.push("/training/history");
    } catch {
      setEnding(false);
    }
  }

  const blockIds = blocks.map(blockDragId);

  const allExercises = blocks.flatMap((b) => b.exercises);
  let nextExId: string | null = null;
  let nextExIdx = -1;
  for (const ex of allExercises) {
    const exRows = rows(ex.id);
    const fi = exRows.findIndex((r) => !r.completed);
    if (fi !== -1) { nextExId = ex.id; nextExIdx = fi; break; }
  }

  return (
    <>
      {/* Fullscreen image overlay */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setFullscreenImage(null)}
          style={{ animation: "fadeIn 0.2s ease" }}
        >
          <button
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
            onClick={() => setFullscreenImage(null)}
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullscreenImage.url}
            alt={fullscreenImage.name}
            className="max-h-[70vh] max-w-full rounded-[var(--radius-lg)] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="mt-4 text-lg font-semibold text-white">{fullscreenImage.name}</p>
        </div>
      )}

      {/* Tap outside keyboard to dismiss */}
      {activeInput && (
        <div
          className="fixed inset-0 z-[290]"
          onPointerDown={(e) => { e.preventDefault(); setActiveInput(null); }}
        />
      )}

      <div className="flex flex-col gap-3 pb-72">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-md"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="truncate text-lg font-bold text-[var(--text1)]">{session.programName}</h1>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--green)] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
              </span>
              <p className="text-xs text-[var(--text3)]">{fmtElapsed(elapsed)}</p>
            </div>
          </div>
          <button
            onClick={handleEnd}
            disabled={ending}
            className="shrink-0 rounded-full border border-[var(--border)] px-4 py-1.5 text-sm text-[var(--text2)] hover:bg-[var(--card2)] disabled:opacity-50"
          >
            {t.workout.endSession}
          </button>
        </div>

        {/* Blocks */}
        {blocks.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text3)]">{t.workout.noExercises}</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
              {blocks.map((block, blockIdx) => (
                <SortableWorkoutBlock key={blockDragId(block)} id={blockDragId(block)}>
                  <div ref={blockIdx === 0 ? firstExRef : undefined} className="flex flex-col gap-2">
                    {block.type === "superset" && (
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                        Superset
                      </p>
                    )}
                    {block.exercises.map((ex) => (
                      <div key={ex.id} ref={(el) => setCardRef(ex.id, el)}>
                        <ExerciseCard
                          ex={ex}
                          setRows={rows(ex.id)}
                          lastSets={session.lastSets[ex.id] ?? []}
                          nextSetIdx={ex.id === nextExId ? nextExIdx : -1}
                          timerActive={timer.active}
                          restingSetIdx={restingSet?.exId === ex.id ? restingSet.setIdx : -1}
                          timerSeconds={timer.seconds}
                          activeInput={activeInput?.exId === ex.id ? activeInput : null}
                          isSuperset={supersetMap.get(ex.id) ?? false}
                          onToggle={(idx) => toggleSet(ex, idx, block)}
                          onActivateSet={(idx) => { const r = rows(ex.id)[idx]; if (r && !r.completed) { setRestingSet({ exId: ex.id, setIdx: idx }); timer.start(ex.restSeconds); } }}
                          onWeight={(idx, v) => patchRow(ex.id, idx, { weightKg: v })}
                          onReps={(idx, v) => patchRow(ex.id, idx, { reps: v })}
                          onFocusInput={(setIdx, field) => focusInput(ex.id, setIdx, field)}
                          onAddSet={() => addRow(ex.id)}
                          onRemoveSet={(idx) => removeRow(ex.id, idx)}
                          onRemoveExercise={() => removeExercise(ex.id)}
                          onToggleSupersetMode={() => toggleSupersetMode(ex.id)}
                          onThumbClick={ex.imageUrl ? () => setFullscreenImage({ url: ex.imageUrl!, name: ex.exerciseName }) : undefined}
                        />
                      </div>
                    ))}
                  </div>
                </SortableWorkoutBlock>
              ))}
            </SortableContext>
          </DndContext>
        )}

        {/* Rest timer — fixed above bottom nav */}
        {timer.active && (
          <RestTimerBar
            seconds={timer.seconds}
            running={timer.running}
            nextExercise={timerNextEx}
            nextSetIdx={timerNextSetIdx}
            onAdd={timer.add}
            onPause={timer.pause}
            onSkip={timer.skip}
          />
        )}

        {/* Add exercise button */}
        <a
          href={`/training/programs/${session.programId}/add-exercise`}
          className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] py-4 text-[var(--text2)] active:bg-[var(--card)]"
        >
          <Plus className="h-5 w-5" />
          {t.training.addExercise}
        </a>

        {/* Always-visible end workout button */}
        <button
          onClick={handleEnd}
          disabled={ending}
          className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border)] py-4 text-sm font-medium text-[var(--text2)] active:bg-[var(--card)] disabled:opacity-50"
        >
          {ending ? t.workout.ending : t.workout.endSession}
        </button>
      </div>

      {/* Custom workout keyboard */}
      {activeInput && (
        <WorkoutKeyboard
          field={activeInput.field}
          onKey={handleKeyboardKey}
          onNext={handleKeyboardNext}
          onPlus={handleKeyboardPlus}
          onMinus={handleKeyboardMinus}
          onDismiss={() => setActiveInput(null)}
        />
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sortable block wrapper
// ---------------------------------------------------------------------------

function SortableWorkoutBlock({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, position: "relative" }}
    >
      {/* Invisible drag handle — narrow strip on left */}
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-y-0 left-0 z-10 w-8 cursor-grab touch-none active:cursor-grabbing"
        aria-label="Drag to reorder"
      />
      {children}
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
  nextSetIdx: number;
  timerActive: boolean;
  restingSetIdx: number;
  timerSeconds: number;
  activeInput: ActiveInput | null;
  isSuperset: boolean;
  onToggle: (idx: number) => void;
  onActivateSet: (idx: number) => void;
  onWeight: (idx: number, v: number) => void;
  onReps: (idx: number, v: number) => void;
  onFocusInput: (setIdx: number, field: "weight" | "reps") => void;
  onAddSet: () => void;
  onRemoveSet: (idx: number) => void;
  onRemoveExercise: () => void;
  onToggleSupersetMode: () => void;
  onThumbClick?: () => void;
}

const ExerciseCard = React.memo(function ExerciseCard({ ex, setRows, lastSets, nextSetIdx, timerActive, restingSetIdx, timerSeconds, activeInput, isSuperset, onToggle, onActivateSet, onWeight: _onWeight, onReps: _onReps, onFocusInput, onAddSet, onRemoveSet, onRemoveExercise, onToggleSupersetMode, onThumbClick }: ExerciseCardProps) {
  const [imgError, setImgError] = useState(false);
  const name = ex.exerciseName;
  const meta = [ex.categoryName, ex.targetMuscleName].filter(Boolean).join(" · ");

  return (
    <div className="overflow-hidden">
      {/* Exercise name + thumbnail */}
      <div className="flex items-center justify-between gap-3 px-0 py-3">
        <button
          onClick={onThumbClick}
          disabled={!onThumbClick}
          className={`shrink-0 ${onThumbClick ? "cursor-pointer" : "cursor-default"}`}
        >
          {ex.imageUrl && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ex.imageUrl}
              alt={name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="h-12 w-12 rounded-full bg-[var(--card2)] object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--card2)]">
              <Dumbbell className="h-5 w-5 text-[var(--text3)]" />
            </div>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--text1)]">{name}</p>
          {meta && <p className="text-xs text-[var(--text3)]">{meta} · {ex.equipment}</p>}
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[2rem_4rem_5rem_4.5rem_4rem] gap-2 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--text3)]/70">
        <div className="text-center">Set</div>
        <div />
        <div className="text-right">{ex.isBodyweight ? "BW" : "kg"}</div>
        <div className="text-right">reps</div>
        <div />
      </div>

      {/* Set rows */}
      {setRows.map((row, idx) => (
        <div key={idx} className="border-t border-[var(--border)]">
          <SetRowItem
            idx={idx}
            row={row}
            last={lastSets[idx] ?? null}
            isBodyweight={ex.isBodyweight}
            isNextSet={idx === nextSetIdx && !timerActive}
            isResting={idx === restingSetIdx}
            timerSeconds={timerSeconds}
            isActiveWeight={activeInput?.setIdx === idx && activeInput?.field === "weight"}
            isActiveReps={activeInput?.setIdx === idx && activeInput?.field === "reps"}
            activeValue={activeInput?.setIdx === idx ? activeInput.value : ""}
            activeSelected={activeInput?.setIdx === idx ? activeInput.selected : false}
            onActivateSet={() => onActivateSet(idx)}
            onToggle={() => onToggle(idx)}
            onRemoveSet={() => onRemoveSet(idx)}
            onFocusWeight={() => onFocusInput(idx, "weight")}
            onFocusReps={() => onFocusInput(idx, "reps")}
          />
        </div>
      ))}

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-0 py-2 mt-2">
        <button
          onClick={onAddSet}
          className="flex items-center gap-2 text-sm font-medium text-[var(--text2)] hover:text-[var(--text1)] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Legg til sett
        </button>
        <button
          onClick={onToggleSupersetMode}
          className={`flex items-center gap-1 text-sm font-medium transition-colors ${
            isSuperset
              ? "text-[var(--accent)]"
              : "text-[var(--text2)] hover:text-[var(--text1)]"
          }`}
          title={isSuperset ? "Superset aktivt" : "Aktiver superset"}
        >
          <Link2 className="h-4 w-4" />
          Superset
        </button>
      </div>

    </div>
  );
});

// ---------------------------------------------------------------------------
// Set row
// ---------------------------------------------------------------------------

interface SetRowItemProps {
  idx: number;
  row: SetRow;
  last: LastSetRow | null;
  isBodyweight: boolean;
  isNextSet: boolean;
  isResting: boolean;
  timerSeconds: number;
  isActiveWeight: boolean;
  isActiveReps: boolean;
  activeValue: string;
  activeSelected: boolean;
  onActivateSet: () => void;
  onToggle: () => void;
  onRemoveSet: () => void;
  onFocusWeight: () => void;
  onFocusReps: () => void;
}

const SetRowItem = React.memo(function SetRowItem({ idx, row, last, isBodyweight, isNextSet, isResting, timerSeconds, isActiveWeight, isActiveReps, activeValue, activeSelected, onActivateSet, onToggle, onRemoveSet, onFocusWeight, onFocusReps }: SetRowItemProps) {
  const t = useT();
  const weightDisplay = isActiveWeight ? activeValue : (row.weightKg ? String(row.weightKg) : "");
  const repsDisplay = isActiveReps ? activeValue : (row.reps ? String(row.reps) : "");
  const isActive = isActiveWeight || isActiveReps;

  return (
    <div
      className={`grid grid-cols-[2rem_4rem_5rem_4.5rem_4rem] items-center gap-2 px-2 py-1.5 border-l-2 transition-colors ${
        isActive
          ? "bg-[var(--accent)]/20 border-l-[var(--accent)]"
          : isResting
          ? "bg-[var(--green-light)] border-l-transparent"
          : row.completed
          ? "bg-[var(--bg2)] border-l-transparent opacity-60"
          : isNextSet
          ? "bg-[var(--accent)]/10 border-l-[var(--accent)]"
          : "border-l-transparent"
      }`}
    >
      {/* Set number / GO / REST — clickable */}
      {isResting ? (
        <div className="flex flex-col items-center leading-tight">
          <span className="text-[8px] font-bold uppercase text-[var(--green)]">{t.workout.restLabel}</span>
          <span className="text-xs font-bold tabular-nums text-[var(--green)]">{fmtTimer(timerSeconds)}</span>
        </div>
      ) : isNextSet ? (
        <div className="text-center">
          <span className="text-xs font-bold text-[var(--accent)]">{t.workout.go}</span>
        </div>
      ) : (
        <div
          onClick={() => onActivateSet()}
          className={`text-center text-sm font-semibold cursor-pointer transition-opacity hover:opacity-60 ${row.completed ? "text-[var(--green)]" : "text-[var(--text3)]"}`}
        >
          {idx + 1}
        </div>
      )}

      {/* KG / bodyweight */}
      {isBodyweight ? (
        <p className={`text-right text-xs font-medium ${row.completed ? "text-[var(--green)]/70" : "text-[var(--text2)]"}`}>
          BW
        </p>
      ) : (
        <div
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onFocusWeight(); }}
          className={`flex h-6 items-center justify-end rounded px-1 text-xs font-medium cursor-pointer transition-colors ${
            isActiveWeight
              ? "bg-[var(--accent)] text-white"
              : row.completed
              ? "text-[var(--green)]/70"
              : "text-[var(--text1)]"
          }`}
        >
          {weightDisplay || <span className="opacity-30">—</span>}
        </div>
      )}

      {/* Reps */}
      <div
        onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onFocusReps(); }}
        className={`flex h-6 items-center justify-end rounded px-1 text-xs font-medium cursor-pointer transition-colors ${
          isActiveReps
            ? "bg-[var(--accent)] text-white"
            : row.completed
            ? "text-[var(--green)]/70"
            : "text-[var(--text1)]"
        }`}
      >
        {repsDisplay || <span className="opacity-30">—</span>}
      </div>

      {/* Complete and delete buttons */}
      <div className="flex justify-end gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
            row.completed
              ? "border-[var(--green)] bg-[var(--green)] text-white"
              : isNextSet
              ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
              : "border-[var(--text3)] text-[var(--text3)]"
          }`}
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemoveSet(); }}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--red)] transition-colors hover:bg-[var(--red)]/20"
          title="Slett sett"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Custom workout keyboard
// ---------------------------------------------------------------------------

interface WorkoutKeyboardProps {
  field: "weight" | "reps";
  onKey: (k: string) => void;
  onNext: () => void;
  onPlus: () => void;
  onMinus: () => void;
  onDismiss: () => void;
}

const WorkoutKeyboard = React.memo(function WorkoutKeyboard({ field, onKey, onNext, onPlus, onMinus, onDismiss }: WorkoutKeyboardProps) {
  const numBtn = "flex h-11 items-center justify-center rounded-lg bg-[var(--card2)] text-base font-semibold text-[var(--text1)] active:opacity-60 select-none";
  const smBtn = "flex h-11 items-center justify-center rounded-lg bg-[var(--card2)] text-xs font-medium text-[var(--text2)] active:opacity-60 select-none";

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[300] border-t border-[var(--border)] bg-[var(--card)] px-2 pb-8 pt-2"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Drag handle / dismiss */}
      <div className="mb-2 flex justify-center">
        <button
          onPointerDown={(e) => { e.preventDefault(); onDismiss(); }}
          className="h-1 w-10 rounded-full bg-[var(--border)]"
        />
      </div>

      <div className="flex gap-1.5">
        {/* 3-column numpad */}
        <div className="flex-[3] grid grid-cols-3 gap-1.5">
          {["1","2","3","4","5","6","7","8","9"].map((k) => (
            <button key={k} onPointerDown={(e) => { e.preventDefault(); onKey(k); }} className={numBtn}>{k}</button>
          ))}
          <button
            onPointerDown={(e) => { e.preventDefault(); if (field === "weight") onKey("."); }}
            className={`${numBtn} ${field === "reps" ? "opacity-30" : ""}`}
          >
            .
          </button>
          <button onPointerDown={(e) => { e.preventDefault(); onKey("0"); }} className={numBtn}>0</button>
          <button onPointerDown={(e) => { e.preventDefault(); onKey("⌫"); }} className={numBtn}>
            ⌫
          </button>
        </div>

        {/* Right 2-column panel */}
        <div className="flex flex-[2] flex-col gap-1.5">
          <div className="grid flex-1 grid-cols-2 gap-1.5">
            <button className={smBtn}>🏴</button>
            <button className={smBtn}>RPE</button>
            <button className={smBtn}>⏺</button>
            <button className={smBtn}>COPY</button>
            <button onPointerDown={(e) => { e.preventDefault(); onMinus(); }} className={smBtn}>
              <Minus className="h-4 w-4" />
            </button>
            <button onPointerDown={(e) => { e.preventDefault(); onPlus(); }} className={smBtn}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            onPointerDown={(e) => { e.preventDefault(); onNext(); }}
            className="flex h-14 items-center justify-center rounded-xl bg-[var(--green)] text-lg font-bold text-white active:opacity-80 select-none"
          >
            NEXT
          </button>
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Rest timer bar
// ---------------------------------------------------------------------------

interface RestTimerBarProps {
  seconds: number;
  running: boolean;
  nextExercise: ProgramExerciseRow | null;
  nextSetIdx: number | null;
  onAdd: (n: number) => void;
  onPause: () => void;
  onSkip: () => void;
}

const RestTimerBar = React.memo(function RestTimerBar({ seconds, running, nextExercise, nextSetIdx, onAdd, onPause, onSkip }: RestTimerBarProps) {
  const t = useT();
  const [nextImgError, setNextImgError] = useState(false);

  return (
    <div className="fixed left-4 right-4 z-[200] overflow-hidden rounded-3xl border border-[var(--accent)]/40 bg-[var(--card)] shadow-[0_8px_32px_rgba(0,0,0,0.5)]" style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom, 0px))' }}>
      <button
        onClick={onPause}
        className="flex w-full items-center justify-between bg-[var(--accent)] px-5 py-3 active:opacity-90"
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
          {running ? t.workout.rest : t.workout.paused}
        </span>
        <span className="text-3xl font-bold tabular-nums leading-none text-white">
          {fmtTimer(seconds)}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
          {running ? t.workout.tapToPause : t.workout.tapToResume}
        </span>
      </button>

      <div className="flex divide-x divide-[var(--border)]">
        <button
          onClick={() => onAdd(-15)}
          className="flex flex-1 items-center justify-center gap-1 py-2.5 text-sm font-medium text-[var(--text2)] active:bg-[var(--card2)]"
        >
          <Minus className="h-3 w-3" />
          15s
        </button>
        <button
          onClick={() => onAdd(15)}
          className="flex flex-1 items-center justify-center gap-1 py-2.5 text-sm font-medium text-[var(--text2)] active:bg-[var(--card2)]"
        >
          <Plus className="h-3 w-3" />
          15s
        </button>
        <button
          onClick={onSkip}
          className="flex flex-1 items-center justify-center py-2.5 text-sm font-semibold text-[var(--accent)] active:bg-[var(--card2)]"
        >
          {t.workout.skip}
        </button>
      </div>

      {nextExercise && (
        <div className="flex items-center gap-3 border-t border-[var(--border)] px-4 py-2.5">
          {nextExercise.imageUrl && !nextImgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={nextExercise.imageUrl}
              alt={nextExercise.exerciseName}
              loading="lazy"
              onError={() => setNextImgError(true)}
              className="h-9 w-9 shrink-0 rounded-full bg-[var(--card2)] object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--card2)]">
              <Dumbbell className="h-4 w-4 text-[var(--text3)]" />
            </div>
          )}
          <p className="flex-1 truncate text-sm font-medium text-[var(--text2)]">
            {t.workout.next}: {nextExercise.exerciseName}
            {nextSetIdx !== null && ` - Set ${nextSetIdx + 1}`}
          </p>
          <button
            onClick={onSkip}
            disabled={nextSetIdx !== null}
            className="flex items-center gap-0.5 rounded-full bg-[var(--card2)] px-3 py-1.5 text-xs font-semibold text-[var(--text2)] active:bg-[var(--border)] disabled:opacity-40"
          >
            <Play className="h-3 w-3 fill-current" />
            <Play className="-ml-1 h-3 w-3 fill-current" />
          </button>
        </div>
      )}
    </div>
  );
});

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
