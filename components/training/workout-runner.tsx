"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Dumbbell, GripVertical, Minus, Play, Plus, Trash2, X } from "lucide-react";
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

function blockDragId(block: ProgramBlock) {
  return block.exercises[0].id;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function WorkoutRunner({ session }: { session: ActiveSession }) {
  const router = useRouter();
  const timer = useRestTimer();
  const [blocks, setBlocks] = useState(session.blocks);
  const [setsMap, setSetsMap] = useState<SetsMap>(() =>
    initSets(session.blocks, session.completedSets, session.lastSets),
  );
  const [ending, setEnding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timerNextEx, setTimerNextEx] = useState<ProgramExerciseRow | null>(null);
  const [restingSet, setRestingSet] = useState<{ exId: string; setIdx: number } | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; name: string } | null>(null);
  const [activeInput, setActiveInput] = useState<ActiveInput | null>(null);
  const firstExRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  function setCardRef(exId: string, el: HTMLDivElement | null) {
    if (el) cardRefs.current.set(exId, el);
    else cardRefs.current.delete(exId);
  }

  useEffect(() => {
    if (!timer.active) setRestingSet(null);
  }, [timer.active]);

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

    const blockIdx = blocks.findIndex((b) => b.exercises.some((e) => e.id === ex.id));
    const nextBlock = blocks[blockIdx + 1];
    setTimerNextEx(nextBlock?.exercises[0] ?? null);

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

    // Jump keyboard to next uncompleted set, or next exercise if all done
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
          toggleSet(found.ex, setIdx, found.block);
        }
      }
      setActiveInput(null);
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
    if (!confirm("End workout?")) return;
    setEnding(true);
    await fetch(`/api/training/sessions/${session.id}`, { method: "PUT" });
    router.push("/training/history");
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
          onClick={() => setActiveInput(null)}
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
            Avslutt
          </button>
        </div>

        {/* Blocks */}
        {blocks.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text3)]">This program has no exercises.</p>
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
                          onToggle={(idx) => toggleSet(ex, idx, block)}
                          onWeight={(idx, v) => patchRow(ex.id, idx, { weightKg: v })}
                          onReps={(idx, v) => patchRow(ex.id, idx, { reps: v })}
                          onFocusInput={(setIdx, field) => focusInput(ex.id, setIdx, field)}
                          onAddSet={() => addRow(ex.id)}
                          onRemoveSet={(idx) => removeRow(ex.id, idx)}
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
        {timer.active && !activeInput && (
          <RestTimerBar
            seconds={timer.seconds}
            running={timer.running}
            nextExercise={timerNextEx}
            onAdd={timer.add}
            onPause={timer.pause}
            onSkip={timer.skip}
          />
        )}

        {/* Always-visible end workout button */}
        <button
          onClick={handleEnd}
          disabled={ending}
          className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border)] py-4 text-sm font-medium text-[var(--text2)] active:bg-[var(--card)] disabled:opacity-50"
        >
          {ending ? "Avslutter…" : "Avslutt økt"}
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
      <button
        {...attributes}
        {...listeners}
        className="absolute right-2 top-2 z-10 cursor-grab touch-none rounded p-1 text-[var(--text3)] active:cursor-grabbing"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
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
  onToggle: (idx: number) => void;
  onWeight: (idx: number, v: number) => void;
  onReps: (idx: number, v: number) => void;
  onFocusInput: (setIdx: number, field: "weight" | "reps") => void;
  onAddSet: () => void;
  onRemoveSet: (idx: number) => void;
  onThumbClick?: () => void;
}

function ExerciseCard({ ex, setRows, lastSets, nextSetIdx, timerActive, restingSetIdx, timerSeconds, activeInput, onToggle, onWeight, onReps, onFocusInput, onAddSet, onRemoveSet, onThumbClick }: ExerciseCardProps) {
  const [imgError, setImgError] = useState(false);
  const name = ex.exerciseName;
  const meta = [ex.categoryName, ex.targetMuscleName].filter(Boolean).join(" · ");

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)]">
      {/* Exercise name + thumbnail */}
      <div className="flex items-center gap-3 px-4 py-3 pr-10">
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
        <div className="min-w-0">
          <p className="font-semibold text-[var(--text1)]">{name}</p>
          {meta && <p className="text-xs text-[var(--text3)]">{meta} · {ex.equipment}</p>}
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[2.5rem_1fr_5rem_4.5rem_3rem] items-center border-t border-[var(--border)] px-4 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
        <span>Set</span>
        <span>Last</span>
        <span className="text-right">{ex.isBodyweight ? "Type" : "kg"}</span>
        <span className="text-right">Reps</span>
        <span />
      </div>

      {/* Set rows */}
      {setRows.map((row, idx) => (
        <SwipeableSetRow key={idx} onDelete={() => onRemoveSet(idx)}>
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
            onToggle={() => onToggle(idx)}
            onFocusWeight={() => onFocusInput(idx, "weight")}
            onFocusReps={() => onFocusInput(idx, "reps")}
          />
        </SwipeableSetRow>
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
// Swipeable row wrapper — swipe left to reveal delete, swipe right to close
// ---------------------------------------------------------------------------

function SwipeableSetRow({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  const [offset, setOffset] = useState(0);
  const [settled, setSettled] = useState(true);
  const startRef = useRef({ x: 0, y: 0, active: false, locked: false, startOffset: 0 });
  const DELETE_W = 72;

  function onPointerDown(e: React.PointerEvent) {
    startRef.current = { x: e.clientX, y: e.clientY, active: true, locked: false, startOffset: offset };
    setSettled(false);
  }

  function onPointerMove(e: React.PointerEvent) {
    const s = startRef.current;
    if (!s.active || s.locked) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dy) > Math.abs(dx) + 6) { s.locked = true; setSettled(true); return; }
    if (Math.abs(dx) < 4) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const newOffset = Math.min(0, Math.max(s.startOffset + dx, -DELETE_W));
    setOffset(newOffset);
  }

  function onPointerUp() {
    startRef.current.active = false;
    setSettled(true);
    setOffset((prev) => (prev < -(DELETE_W * 0.5) ? -DELETE_W : 0));
  }

  function handleDelete() {
    setOffset(-DELETE_W * 3);
    setTimeout(onDelete, 200);
  }

  return (
    <div className="relative overflow-hidden border-t border-[var(--border)]">
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-[var(--red)]"
        style={{ width: DELETE_W }}
      >
        <button
          onClick={handleDelete}
          className="flex h-full w-full items-center justify-center"
          aria-label="Slett sett"
        >
          <Trash2 className="h-5 w-5 text-white" />
        </button>
      </div>
      <div
        className="relative bg-[var(--card)]"
        style={{
          transform: `translateX(${offset}px)`,
          transition: settled ? "transform 0.22s ease" : "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {children}
      </div>
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
  isNextSet: boolean;
  isResting: boolean;
  timerSeconds: number;
  isActiveWeight: boolean;
  isActiveReps: boolean;
  activeValue: string;
  activeSelected: boolean;
  onToggle: () => void;
  onFocusWeight: () => void;
  onFocusReps: () => void;
}

function SetRowItem({ idx, row, last, isBodyweight, isNextSet, isResting, timerSeconds, isActiveWeight, isActiveReps, activeValue, activeSelected, onToggle, onFocusWeight, onFocusReps }: SetRowItemProps) {
  const weightDisplay = isActiveWeight ? activeValue : (row.weightKg ? String(row.weightKg) : "");
  const repsDisplay = isActiveReps ? activeValue : (row.reps ? String(row.reps) : "");

  return (
    <div
      className={`grid grid-cols-[2.5rem_1fr_5rem_4.5rem_3rem] items-center px-4 py-2 transition-colors ${
        isResting
          ? "bg-[var(--green-light)]"
          : row.completed
          ? "bg-[var(--green-light)]"
          : isNextSet
          ? "bg-[var(--accent)]/10 border-l-2 border-l-[var(--accent)]"
          : ""
      }`}
      onClick={() => { if (!row.completed) onToggle(); }}
    >
      {/* Set number / GO / REST */}
      {isResting ? (
        <div className="flex flex-col leading-tight">
          <span className="text-[9px] font-bold uppercase tracking-wide text-[var(--green)]">REST</span>
          <span className="text-xs font-bold tabular-nums text-[var(--green)]">{fmtTimer(timerSeconds)}</span>
        </div>
      ) : isNextSet ? (
        <span className="text-xs font-bold text-[var(--accent)]">GO</span>
      ) : (
        <span className={`text-sm font-semibold ${row.completed ? "text-[var(--green)]" : "text-[var(--text3)]"}`}>
          {idx + 1}
        </span>
      )}

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
        <div
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onFocusWeight(); }}
          className={`flex h-8 items-center justify-end rounded px-1 text-sm font-medium transition-colors ${
            isActiveWeight && activeSelected
              ? "bg-[var(--accent)] text-white ring-1 ring-[var(--accent)]"
              : isActiveWeight
              ? "bg-[var(--accent)]/10 text-[var(--accent)] ring-1 ring-[var(--accent)]"
              : row.completed
              ? "text-[var(--green)]"
              : "text-[var(--text1)]"
          }`}
        >
          {weightDisplay || <span className="opacity-40">0</span>}
        </div>
      )}

      {/* Reps */}
      <div
        onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onFocusReps(); }}
        className={`flex h-8 items-center justify-end rounded px-1 text-sm font-medium transition-colors ${
          isActiveReps && activeSelected
            ? "bg-[var(--accent)] text-white ring-1 ring-[var(--accent)]"
            : isActiveReps
            ? "bg-[var(--accent)]/10 text-[var(--accent)] ring-1 ring-[var(--accent)]"
            : row.completed
            ? "text-[var(--green)]"
            : "text-[var(--text1)]"
        }`}
      >
        {repsDisplay || <span className="opacity-40">0</span>}
      </div>

      {/* Complete button */}
      <div className="flex justify-end">
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
            row.completed
              ? "border-[var(--green)] bg-[var(--green)] text-white"
              : isNextSet
              ? "border-[var(--accent)] text-[var(--accent)]"
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

function WorkoutKeyboard({ field, onKey, onNext, onPlus, onMinus, onDismiss }: WorkoutKeyboardProps) {
  const numBtn = "flex h-14 items-center justify-center rounded-xl bg-[var(--card2)] text-xl font-semibold text-[var(--text1)] active:opacity-60 select-none";
  const smBtn = "flex h-14 items-center justify-center rounded-xl bg-[var(--card2)] text-sm font-medium text-[var(--text2)] active:opacity-60 select-none";

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
}

// ---------------------------------------------------------------------------
// Rest timer bar
// ---------------------------------------------------------------------------

interface RestTimerBarProps {
  seconds: number;
  running: boolean;
  nextExercise: ProgramExerciseRow | null;
  onAdd: (n: number) => void;
  onPause: () => void;
  onSkip: () => void;
}

function RestTimerBar({ seconds, running, nextExercise, onAdd, onPause, onSkip }: RestTimerBarProps) {
  const [nextImgError, setNextImgError] = useState(false);

  return (
    <div className="fixed left-4 right-4 z-[200] overflow-hidden rounded-3xl border border-[var(--accent)]/40 bg-[var(--card)] shadow-[0_8px_32px_rgba(0,0,0,0.5)]" style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}>
      <button
        onClick={onPause}
        className="flex w-full items-center justify-between bg-[var(--accent)] px-5 py-3 active:opacity-90"
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
          {running ? "Rest" : "Paused"}
        </span>
        <span className="text-3xl font-bold tabular-nums leading-none text-white">
          {fmtTimer(seconds)}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
          tap to {running ? "pause" : "resume"}
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
          Skip
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
            Neste: {nextExercise.exerciseName}
          </p>
          <button
            onClick={onSkip}
            className="flex items-center gap-0.5 rounded-full bg-[var(--card2)] px-3 py-1.5 text-xs font-semibold text-[var(--text2)] active:bg-[var(--border)]"
          >
            <Play className="h-3 w-3 fill-current" />
            <Play className="-ml-1 h-3 w-3 fill-current" />
          </button>
        </div>
      )}
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
