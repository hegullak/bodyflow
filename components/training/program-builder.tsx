"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Copy,
  Dumbbell,
  GripVertical,
  Link2,
  Link2Off,
  Minus,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
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
import type { ProgramDetail, ProgramBlock, ProgramExerciseRow } from "@/lib/training/programs";

interface Props {
  program: ProgramDetail;
  activeSessionId: string | null;
}

function blockDragId(block: ProgramBlock) {
  return block.exercises[0].id;
}

export function ProgramBuilder({ program: initial, activeSessionId }: Props) {
  const router = useRouter();
  const [program, setProgram] = useState(initial);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(initial.name);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [starting, setStarting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  async function saveName() {
    const name = nameValue.trim();
    if (!name || name === program.name) { setEditingName(false); return; }
    await fetch(`/api/training/programs/${program.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setProgram((p) => ({ ...p, name }));
    setEditingName(false);
  }

  async function handleDelete() {
    if (!confirm(`Slett "${program.name}"?`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/training/programs/${program.id}`, { method: "DELETE" });
      router.push("/training/programs");
    } catch {
      setDeleting(false);
    }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/training/programs/${program.id}/duplicate`, { method: "POST" });
      if (res.ok) {
        const copy = await res.json() as { id: string };
        router.push(`/training/programs/${copy.id}`);
      }
    } catch {
      // fall through — duplicating resets to false below
    }
    setDuplicating(false);
  }

  async function handleUpdateExercise(
    exerciseId: string,
    patch: { sets?: number; reps?: number; restSeconds?: number; isBodyweight?: boolean },
  ) {
    await fetch(`/api/training/programs/${program.id}/exercises/${exerciseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setProgram((p) => ({
      ...p,
      blocks: p.blocks.map((b) => ({
        ...b,
        exercises: b.exercises.map((e) => (e.id === exerciseId ? { ...e, ...patch } : e)),
      })),
    }));
  }

  async function handleRemoveExercise(exerciseId: string) {
    await fetch(`/api/training/programs/${program.id}/exercises/${exerciseId}`, {
      method: "DELETE",
    });
    setProgram((p) => {
      const blocks = p.blocks
        .map((b) => ({ ...b, exercises: b.exercises.filter((e) => e.id !== exerciseId) }))
        .filter((b) => b.exercises.length > 0);
      return { ...p, blocks };
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = program.blocks.findIndex((b) => blockDragId(b) === active.id);
    const newIdx = program.blocks.findIndex((b) => blockDragId(b) === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const newBlocks = arrayMove(program.blocks, oldIdx, newIdx);
    setProgram((p) => ({ ...p, blocks: newBlocks }));

    const orderedIds = newBlocks.flatMap((b) => b.exercises.map((e) => e.id));
    await fetch(`/api/training/programs/${program.id}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });
  }

  async function handleCreateSuperset(ids: string[]) {
    await fetch(`/api/training/programs/${program.id}/supersets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseIds: ids }),
    });
    router.refresh();
  }

  async function handleStart() {
    setStarting(true);
    try {
      await fetch("/api/training/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: program.id }),
      });
    } finally {
      router.push("/training/workout");
    }
  }

  async function handleRemoveSuperset(supersetId: string) {
    await fetch(`/api/training/programs/${program.id}/supersets`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supersetId }),
    });
    router.refresh();
  }

  const totalExercises = program.blocks.reduce((n, b) => n + b.exercises.length, 0);
  const blockIds = program.blocks.map(blockDragId);

  return (
    <div className="flex flex-col gap-4">
      {/* Back nav + actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/training/programs"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-md"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex gap-1">
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            title="Dupliser"
            className="rounded-full p-2 text-[var(--text3)] hover:bg-[var(--card2)] hover:text-[var(--text1)]"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Slett"
            className="rounded-full p-2 text-[var(--text3)] hover:bg-[var(--red-light)] hover:text-[var(--red)]"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Program name */}
      <div className="flex items-center gap-2">
        {activeSessionId && (
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--green)] opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--green)]" />
          </span>
        )}
        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            className="flex-1 rounded-[var(--radius-sm)] border border-[var(--accent)] bg-[var(--card)] px-3 py-1 text-xl font-bold text-[var(--text1)] focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="flex-1 text-left text-xl font-bold text-[var(--text1)] underline-offset-2 hover:underline"
          >
            {program.name}
          </button>
        )}
      </div>

      {/* Exercise blocks */}
      {totalExercises === 0 ? (
        <div className="py-8 text-center text-[var(--text3)]">
          <Dumbbell className="mx-auto mb-2 h-8 w-8" />
          <p>Ingen øvelser ennå.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {program.blocks.map((block, blockIdx) => (
                <SortableBlock key={blockDragId(block)} id={blockDragId(block)}>
                  {block.type === "superset" ? (
                    <div className="rounded-[var(--radius-md)] border border-[var(--accent)]/30 bg-[var(--card)]">
                      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">
                          Supersett
                        </span>
                        <button
                          onClick={() => block.supersetId && handleRemoveSuperset(block.supersetId)}
                          className="flex items-center gap-1 text-xs text-[var(--text3)] hover:text-[var(--text1)]"
                        >
                          <Link2Off className="h-3 w-3" /> Løs opp
                        </button>
                      </div>
                      {block.exercises.map((ex, exIdx) => (
                        <SwipeableExerciseRow
                          key={ex.id}
                          onDelete={() => handleRemoveExercise(ex.id)}
                          onEdit={() => {}}
                        >
                          <ExerciseRow
                            ex={ex}
                            onUpdate={(patch) => handleUpdateExercise(ex.id, patch)}
                            onRemove={() => handleRemoveExercise(ex.id)}
                            showDivider={exIdx < block.exercises.length - 1}
                          />
                        </SwipeableExerciseRow>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)]">
                      {block.exercises.map((ex) => (
                        <SwipeableExerciseRow
                          key={ex.id}
                          onDelete={() => handleRemoveExercise(ex.id)}
                          onEdit={() => {}}
                        >
                          <ExerciseRow
                            ex={ex}
                            onUpdate={(patch) => handleUpdateExercise(ex.id, patch)}
                            onRemove={() => handleRemoveExercise(ex.id)}
                            showDivider={false}
                            canSuperset={program.blocks.length > 1}
                            adjacentId={
                              blockIdx + 1 < program.blocks.length &&
                              program.blocks[blockIdx + 1].type === "exercise"
                                ? program.blocks[blockIdx + 1].exercises[0].id
                                : null
                            }
                            onCreateSuperset={handleCreateSuperset}
                          />
                        </SwipeableExerciseRow>
                      ))}
                    </div>
                  )}
                </SortableBlock>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Start / Continue workout */}
      {totalExercises > 0 && (
        <button
          onClick={handleStart}
          disabled={starting}
          className={`flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] py-3.5 font-semibold text-white disabled:opacity-60 ${
            activeSessionId ? "bg-[var(--green)]" : "bg-[var(--accent)]"
          }`}
        >
          {activeSessionId ? (
            <>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              {starting ? "Åpner…" : "Fortsett treningsøkt"}
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-white" />
              {starting ? "Starter…" : "Start treningsøkt"}
            </>
          )}
        </button>
      )}

      {/* Add exercise */}
      <Link
        href={`/training/programs/${program.id}/add-exercise`}
        className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] py-4 text-[var(--text2)] active:bg-[var(--card)]"
      >
        <Plus className="h-5 w-5" />
        Legg til øvelse
      </Link>

      <div className="pb-4" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable block wrapper
// ---------------------------------------------------------------------------

function SortableBlock({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: "relative",
      }}
    >
      {/* Drag handle — positioned absolutely on the left edge */}
      <button
        {...attributes}
        {...listeners}
        className="absolute -left-1 top-1/2 z-10 -translate-y-1/2 cursor-grab touch-none rounded p-1 text-[var(--text3)] active:cursor-grabbing"
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
// Swipeable exercise row — swipe left to reveal delete
// ---------------------------------------------------------------------------

function SwipeableExerciseRow({ onDelete, onEdit, children }: { onDelete: () => void; onEdit?: () => void; children: React.ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const sw = useRef({ startX: 0, startY: 0, tracking: false, revealed: false, dragging: false });
  const REVEAL_W = 112;
  const SNAP = 40;

  function snap(x: number, animate = true) {
    const el = innerRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 0.25s cubic-bezier(0.4,0,0.2,1)" : "none";
    el.style.transform = `translateX(${x}px)`;
    sw.current.revealed = x < 0;
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    sw.current = { startX: e.clientX, startY: e.clientY, tracking: true, dragging: false, revealed: sw.current.revealed };
    if (innerRef.current) innerRef.current.style.transition = "none";
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!sw.current.tracking || !innerRef.current) return;
    const dx = e.clientX - sw.current.startX;
    const dy = e.clientY - sw.current.startY;
    if (!sw.current.dragging && Math.abs(dy) > Math.abs(dx) + 5) { sw.current.tracking = false; return; }
    if (!sw.current.dragging && Math.abs(dx) > 4) sw.current.dragging = true;
    if (!sw.current.dragging) return;
    const base = sw.current.revealed ? -REVEAL_W : 0;
    const x = Math.max(-REVEAL_W, Math.min(0, base + dx));
    innerRef.current.style.transform = `translateX(${x}px)`;
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!sw.current.tracking) return;
    sw.current.tracking = false;
    if (!sw.current.dragging) return;
    const dx = e.clientX - sw.current.startX;
    const base = sw.current.revealed ? -REVEAL_W : 0;
    snap(base + dx < -SNAP ? -REVEAL_W : 0);
  }

  function handleEdit() {
    snap(0);
    setTimeout(() => onEdit?.(), 200);
  }

  function handleDelete() {
    snap(0);
    setTimeout(onDelete, 200);
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex" style={{ width: REVEAL_W }}>
        <button
          type="button"
          onClick={handleEdit}
          className="flex w-14 items-center justify-center bg-blue-500 text-white active:opacity-80"
          aria-label="Rediger"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="flex w-14 items-center justify-center bg-[var(--red)] text-white active:opacity-80"
          aria-label="Slett"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={innerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { sw.current.tracking = false; snap(sw.current.revealed ? -REVEAL_W : 0); }}
        style={{
          touchAction: "pan-y",
          userSelect: "none",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exercise row in builder
// ---------------------------------------------------------------------------

interface ExerciseRowProps {
  ex: ProgramExerciseRow;
  onUpdate: (patch: { sets?: number; reps?: number; restSeconds?: number; isBodyweight?: boolean }) => void;
  onRemove: () => void;
  showDivider: boolean;
  canSuperset?: boolean;
  adjacentId?: string | null;
  onCreateSuperset?: (ids: string[]) => void;
}

function ExerciseRow({ ex, onUpdate, onRemove, showDivider, canSuperset, adjacentId, onCreateSuperset }: ExerciseRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-0 py-3 text-left"
      >
        {/* Thumbnail */}
        {ex.imageUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ex.imageUrl}
            alt={ex.exerciseName}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-10 w-10 shrink-0 rounded-[var(--radius-sm)] bg-[var(--card2)] object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--card2)]">
            <Dumbbell className="h-4 w-4 text-[var(--text3)]" />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium text-[var(--text1)]">{ex.exerciseName}</span>
          <span className="text-xs text-[var(--text3)]">
            {ex.sets} sett × {ex.reps} reps · {ex.restSeconds}s hvile
            {ex.isBodyweight ? " · Kroppsvekt" : ""}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-[var(--text3)]" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text3)]" />
        )}
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 px-0 py-3">
          <div className="grid grid-cols-3 gap-2">
            <Stepper label="Sett" value={ex.sets} min={1} max={20} onChange={(v) => onUpdate({ sets: v })} />
            <Stepper label="Reps" value={ex.reps} min={1} max={100} onChange={(v) => onUpdate({ reps: v })} />
            <Stepper label="Hvile (s)" value={ex.restSeconds} min={0} max={600} step={15} onChange={(v) => onUpdate({ restSeconds: v })} />
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={ex.isBodyweight}
              onChange={(e) => onUpdate({ isBodyweight: e.target.checked })}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <span className="text-sm text-[var(--text2)]">Kroppsvekt</span>
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            {canSuperset && adjacentId && onCreateSuperset && (
              <button
                onClick={() => onCreateSuperset([ex.id, adjacentId])}
                className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-[var(--accent)] hover:bg-[var(--accent-light)]"
              >
                <Link2 className="h-3 w-3" /> Supersett med neste
              </button>
            )}
            <button
              onClick={onRemove}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-[var(--red)] hover:bg-[var(--red-light)]"
            >
              <Trash2 className="h-3 w-3" /> Fjern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--bg)] px-2 py-2">
      <span className="text-xs text-[var(--text3)]">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text2)] hover:bg-[var(--card2)]"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="min-w-[2rem] text-center text-sm font-medium text-[var(--text1)]">
          {value}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text2)] hover:bg-[var(--card2)]"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
