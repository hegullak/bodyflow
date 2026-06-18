"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Copy,
  Dumbbell,
  Link2,
  Link2Off,
  Minus,
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
    patch: { sets?: number; reps?: number; restSeconds?: number },
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
                    <div>
                      <div className="flex items-center justify-between px-0 py-2">
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
                        <ExerciseRow
                          key={ex.id}
                          ex={ex}
                          onUpdate={(patch) => handleUpdateExercise(ex.id, patch)}
                          onRemove={() => handleRemoveExercise(ex.id)}
                          showDivider={exIdx < block.exercises.length - 1}
                        />
                      ))}
                    </div>
                  ) : (
                    <div>
                      {block.exercises.map((ex) => (
                        <ExerciseRow
                          key={ex.id}
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
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, position: "relative" }}
    >
      {/* Invisible drag handle — narrow strip on left, doesn't block content interaction */}
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
// Exercise row in builder
// ---------------------------------------------------------------------------

interface ExerciseRowProps {
  ex: ProgramExerciseRow;
  onUpdate: (patch: { sets?: number; reps?: number; restSeconds?: number }) => void;
  onRemove: () => void;
  showDivider: boolean;
  canSuperset?: boolean;
  adjacentId?: string | null;
  onCreateSuperset?: (ids: string[]) => void;
}

function ExerciseRow({ ex, onUpdate, onRemove, showDivider, canSuperset, adjacentId, onCreateSuperset }: ExerciseRowProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div>
      {/* Exercise header */}
      <div className="flex items-center gap-3 px-0 py-3">
        {/* Thumbnail + name */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
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
          <div className="min-w-0">
            <p className="truncate font-medium text-[var(--text1)]">{ex.exerciseName}</p>
            <p className="text-xs text-[var(--text3)]">{ex.sets} sett · {ex.reps} reps · {ex.restSeconds}s hvile</p>
          </div>
        </div>
        {/* Plus and delete buttons */}
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => onUpdate({ sets: Math.min(20, ex.sets + 1) })}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text2)] hover:bg-[var(--card2)]"
            title="Legg til sett"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={onRemove}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text2)] hover:bg-[var(--red)]/10 hover:text-[var(--red)]"
            title="Fjern øvelse"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Individual set rows */}
      <div className="space-y-1 px-0 py-2">
        {Array.from({ length: ex.sets }, (_, i) => (
          <div key={i} className="grid grid-cols-[2.5rem_1fr_1fr_1fr] items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--card2)] px-3 py-2">
            <span className="text-xs font-medium text-[var(--text3)]">Sett {i + 1}</span>
            <RepsControl value={ex.reps} onChange={(v) => onUpdate({ reps: v })} />
            <RestControl value={ex.restSeconds} onChange={(v) => onUpdate({ restSeconds: v })} />
            <div className="flex items-center justify-end">
              {ex.sets > 1 && (
                <button
                  onClick={() => onUpdate({ sets: ex.sets - 1 })}
                  className="flex h-6 w-6 items-center justify-center text-[var(--text2)] hover:text-[var(--red)]"
                  title="Fjern sett"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Superset button */}
      {canSuperset && adjacentId && onCreateSuperset && (
        <div className="flex gap-2 px-0 py-2">
          <button
            onClick={() => onCreateSuperset([ex.id, adjacentId])}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-[var(--accent)] hover:bg-[var(--accent-light)]"
          >
            <Link2 className="h-3 w-3" /> Supersett med neste
          </button>
        </div>
      )}

      {showDivider && <hr className="my-2 border-t border-[var(--border)]" />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Set controls
// ---------------------------------------------------------------------------

function RepsControl({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        className="flex h-5 w-5 items-center justify-center rounded text-[var(--text3)] hover:bg-[var(--bg)]"
      >
        <Minus className="h-2.5 w-2.5" />
      </button>
      <span className="flex-1 text-center text-xs font-medium text-[var(--text1)]">{value}</span>
      <button
        onClick={() => onChange(Math.min(100, value + 1))}
        className="flex h-5 w-5 items-center justify-center rounded text-[var(--text3)] hover:bg-[var(--bg)]"
      >
        <Plus className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

function RestControl({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(0, value - 15))}
        className="flex h-5 w-5 items-center justify-center rounded text-[var(--text3)] hover:bg-[var(--bg)]"
      >
        <Minus className="h-2.5 w-2.5" />
      </button>
      <span className="flex-1 text-center text-xs font-medium text-[var(--text1)]">{value}s</span>
      <button
        onClick={() => onChange(Math.min(600, value + 15))}
        className="flex h-5 w-5 items-center justify-center rounded text-[var(--text3)] hover:bg-[var(--bg)]"
      >
        <Plus className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

