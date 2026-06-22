"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, X } from "lucide-react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { ActiveSession } from "@/lib/training/sessions";
import type { ProgramBlock, ProgramExerciseRow } from "@/lib/training/programs";
import { useT } from "@/components/providers/lang-provider";
import { useRestTimer } from "@/hooks/use-rest-timer";
import {
  type ActiveInput,
  type SetsMap,
  type SetRow,
  blockDragId,
  fmtElapsed,
  initSets,
} from "@/lib/training/set-utils";
import { SortableWorkoutBlock } from "./sortable-workout-block";
import { ExerciseCard } from "./exercise-card";
import { WorkoutKeyboard } from "./workout-keyboard";
import { RestTimerBar } from "./rest-timer-bar";

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

  // Clear resting set when timer stops
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!timer.active) setRestingSet(null);
  }, [timer.active]);

  // Auto-focus the next set when rest timer expires
  useEffect(() => {
    if (timer.seconds === 0 && !timer.running && restingSet) {
      focusInput(restingSet.exId, restingSet.setIdx, "weight");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.seconds, timer.running]);

  // Scroll first exercise into view on mount
  useEffect(() => {
    const id = setTimeout(
      () => firstExRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      300,
    );
    return () => clearTimeout(id);
  }, []);

  // Elapsed workout time
  useEffect(() => {
    const t0 = new Date(session.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - t0) / 1000));
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [session.startedAt]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  // ---------------------------------------------------------------------------
  // State helpers
  // ---------------------------------------------------------------------------

  function rows(exId: string): SetRow[] {
    return setsMap.get(exId) ?? [];
  }

  function patchRow(exId: string, idx: number, patch: Partial<SetRow>) {
    setSetsMap((prev) => {
      const next = new Map(prev);
      const r = [...(next.get(exId) ?? [])];
      r[idx] = { ...r[idx], ...patch };
      next.set(exId, r);
      return next;
    });
  }

  function findExAndBlock(exId: string): { ex: ProgramExerciseRow; block: ProgramBlock } | null {
    for (const block of blocks) {
      const ex = block.exercises.find((e) => e.id === exId);
      if (ex) return { ex, block };
    }
    return null;
  }

  function findNextExercise(exId: string): ProgramExerciseRow | null {
    const all = blocks.flatMap((b) => b.exercises);
    const i = all.findIndex((e) => e.id === exId);
    return i !== -1 && i < all.length - 1 ? all[i + 1] : null;
  }

  // ---------------------------------------------------------------------------
  // Set operations
  // ---------------------------------------------------------------------------

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

    // Update timer hints for RestTimerBar
    const updatedExRows = rows(ex.id);
    const nextSetInEx = updatedExRows.findIndex((r, i) => i > idx && !r.completed);
    const isSupersetMode = supersetMap.get(ex.id) ?? false;

    if (nextSetInEx !== -1 && !isSupersetMode) {
      setTimerNextEx(ex);
      setTimerNextSetIdx(nextSetInEx);
    } else {
      const all = blocks.flatMap((b) => b.exercises);
      const exIdx = all.findIndex((e) => e.id === ex.id);
      const nextEx = exIdx !== -1 && exIdx < all.length - 1 ? all[exIdx + 1] : null;
      setTimerNextEx(nextEx ?? null);
      setTimerNextSetIdx(isSupersetMode && nextEx ? idx : null);
    }

    // Resolve next resting target (next incomplete set)
    const nextRestTarget = (() => {
      const nextInEx = exRows.findIndex((r, i) => i > idx && !r.completed);
      if (nextInEx !== -1) return { exId: ex.id, setIdx: nextInEx };
      const nextEx = findNextExercise(ex.id);
      if (nextEx) {
        const nextExRows = rows(nextEx.id);
        const firstIncomplete = nextExRows.findIndex((r) => !r.completed);
        return { exId: nextEx.id, setIdx: firstIncomplete !== -1 ? firstIncomplete : 0 };
      }
      return null;
    })();

    if (block.type === "superset") {
      // Only start timer when all exercises in the superset have completed this set index
      const updatedMap = new Map(setsMap);
      const updatedRows = [...(updatedMap.get(ex.id) ?? [])];
      updatedRows[idx] = { ...updatedRows[idx], completed: true };
      updatedMap.set(ex.id, updatedRows);
      const allDone = block.exercises.every((bex) => updatedMap.get(bex.id)?.[idx]?.completed);
      if (allDone) {
        setRestingSet(nextRestTarget);
        timer.start(ex.restSeconds);
      }
    } else {
      setRestingSet(nextRestTarget);
      timer.start(ex.restSeconds);
    }

    // Immediate auto-focus only when there's no rest timer
    if (ex.restSeconds === 0) {
      if (willAllBeCompleted) {
        const nextEx = findNextExercise(ex.id);
        if (nextEx) setTimeout(() => focusInput(nextEx.id, 0, "weight"), 450);
      } else {
        const nextSetIdx = exRows.findIndex((row, i) => i > idx && !row.completed);
        if (nextSetIdx !== -1) setTimeout(() => focusInput(ex.id, nextSetIdx, "weight"), 450);
      }
    }
  }

  function removeExercise(exId: string) {
    setBlocks((prev) =>
      prev
        .map((b) => ({ ...b, exercises: b.exercises.filter((e) => e.id !== exId) }))
        .filter((b) => b.exercises.length > 0),
    );
  }

  function toggleSupersetMode(exId: string) {
    setSupersetMap((prev) => {
      const next = new Map(prev);
      next.set(exId, !next.get(exId));
      return next;
    });
  }

  // ---------------------------------------------------------------------------
  // Timer actions
  // ---------------------------------------------------------------------------

  function handleSkipToNext() {
    timer.skip();
    if (restingSet) {
      setTimeout(() => focusInput(restingSet.exId, restingSet.setIdx, "weight"), 50);
    }
  }

  function handleAutoNext() {
    if (!restingSet) return;
    const { exId, setIdx } = restingSet;
    const found = findExAndBlock(exId);
    if (!found) return;
    const thisRow = rows(exId)[setIdx];
    if (!thisRow || thisRow.completed) return;
    const prev = rows(exId)[setIdx - 1];
    patchRow(exId, setIdx, {
      weightKg: thisRow.weightKg || prev?.weightKg || 0,
      reps: thisRow.reps || prev?.reps || 0,
    });
    setTimeout(() => toggleSet(found.ex, setIdx, found.block), 50);
  }

  // ---------------------------------------------------------------------------
  // Custom keyboard
  // ---------------------------------------------------------------------------

  function focusInput(exId: string, setIdx: number, field: "weight" | "reps") {
    const row = rows(exId)[setIdx];
    if (!row) return;
    const value =
      field === "weight"
        ? row.weightKg ? String(row.weightKg) : ""
        : row.reps ? String(row.reps) : "";
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
      newVal = selected ? key : value === "0" && key !== "." ? key : value + key;
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
      return;
    }

    const found = findExAndBlock(exId);
    if (!found) return;
    const row = rows(exId)[setIdx];
    if (!row || row.completed) return;

    if (typeof document !== "undefined") {
      (document.activeElement as HTMLElement)?.blur();
    }
    setActiveInput(null);
    toggleSet(found.ex, setIdx, found.block);

    if (found.ex.restSeconds === 0) {
      setTimeout(() => {
        const exRows = rows(exId);
        const nextSetIdx = exRows.findIndex((r, i) => i > setIdx && !r.completed);
        if (nextSetIdx !== -1) {
          focusInput(exId, nextSetIdx, "weight");
        } else {
          const nextEx = findNextExercise(exId);
          if (nextEx) focusInput(nextEx.id, 0, "weight");
        }
      }, 100);
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

  // ---------------------------------------------------------------------------
  // Drag-and-drop
  // ---------------------------------------------------------------------------

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = blocks.findIndex((b) => blockDragId(b) === active.id);
    const newIdx = blocks.findIndex((b) => blockDragId(b) === over.id);
    if (oldIdx !== -1 && newIdx !== -1) setBlocks(arrayMove(blocks, oldIdx, newIdx));
  }

  // ---------------------------------------------------------------------------
  // Session end
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const blockIds = blocks.map(blockDragId);

  const allExercises = blocks.flatMap((b) => b.exercises);
  let nextExId: string | null = null;
  let nextExIdx = -1;
  for (const ex of allExercises) {
    const fi = rows(ex.id).findIndex((r) => !r.completed);
    if (fi !== -1) { nextExId = ex.id; nextExIdx = fi; break; }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Fullscreen exercise image overlay */}
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

        {/* Exercise blocks */}
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
                          restingSetIdx={(() => {
                            if (!restingSet || restingSet.exId !== ex.id) return -1;
                            const si = restingSet.setIdx;
                            return rows(ex.id)[si]?.completed ? -1 : si;
                          })()}
                          timerSeconds={timer.seconds}
                          activeInput={activeInput?.exId === ex.id ? activeInput : null}
                          isSuperset={supersetMap.get(ex.id) ?? false}
                          onToggle={(idx) => toggleSet(ex, idx, block)}
                          onActivateSet={(idx) => {
                            const r = rows(ex.id)[idx];
                            if (r && !r.completed) {
                              setRestingSet({ exId: ex.id, setIdx: idx });
                              timer.start(ex.restSeconds);
                            }
                          }}
                          onWeight={(idx, v) => patchRow(ex.id, idx, { weightKg: v })}
                          onReps={(idx, v) => patchRow(ex.id, idx, { reps: v })}
                          onFocusInput={(setIdx, field) => focusInput(ex.id, setIdx, field)}
                          onAddSet={() => addRow(ex.id)}
                          onRemoveSet={(idx) => removeRow(ex.id, idx)}
                          onRemoveExercise={() => removeExercise(ex.id)}
                          onToggleSupersetMode={() => toggleSupersetMode(ex.id)}
                          onThumbClick={
                            ex.imageUrl
                              ? () => setFullscreenImage({ url: ex.imageUrl!, name: ex.exerciseName })
                              : undefined
                          }
                        />
                      </div>
                    ))}
                  </div>
                </SortableWorkoutBlock>
              ))}
            </SortableContext>
          </DndContext>
        )}

        {/* Rest timer */}
        {timer.active && (
          <RestTimerBar
            seconds={timer.seconds}
            running={timer.running}
            nextExercise={timerNextEx}
            nextSetIdx={timerNextSetIdx}
            onAdd={timer.add}
            onPause={timer.pause}
            onSkip={handleSkipToNext}
            onAutoNext={handleAutoNext}
          />
        )}

        <a
          href={`/training/programs/${session.programId}/add-exercise`}
          className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] py-4 text-[var(--text2)] active:bg-[var(--card)]"
        >
          <Plus className="h-5 w-5" />
          {t.training.addExercise}
        </a>

        <button
          onClick={handleEnd}
          disabled={ending}
          className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border)] py-4 text-sm font-medium text-[var(--text2)] active:bg-[var(--card)] disabled:opacity-50"
        >
          {ending ? t.workout.ending : t.workout.endSession}
        </button>
      </div>

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

      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </>
  );
}
