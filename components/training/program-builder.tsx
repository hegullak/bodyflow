"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Dumbbell,
  Link2,
  Link2Off,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProgramDetail, ProgramExerciseRow } from "@/lib/training/programs";

interface Props {
  program: ProgramDetail;
}

export function ProgramBuilder({ program: initial }: Props) {
  const router = useRouter();
  const [program, setProgram] = useState(initial);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(initial.name);
  const [isPending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

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
    await fetch(`/api/training/programs/${program.id}`, { method: "DELETE" });
    router.push("/training/programs");
  }

  async function handleDuplicate() {
    setDuplicating(true);
    const res = await fetch(`/api/training/programs/${program.id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const copy = await res.json();
      router.push(`/training/programs/${copy.id}`);
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
    startTransition(() => router.refresh());
  }

  async function handleRemoveExercise(exerciseId: string) {
    await fetch(`/api/training/programs/${program.id}/exercises/${exerciseId}`, {
      method: "DELETE",
    });
    startTransition(() => router.refresh());
  }

  async function handleMoveExercise(exerciseId: string, direction: "up" | "down") {
    // Collect all exercise IDs in current order (standalone and within supersets)
    const allIds = program.blocks.flatMap((b) => b.exercises.map((e) => e.id));
    const idx = allIds.indexOf(exerciseId);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= allIds.length) return;
    const reordered = [...allIds];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    await fetch(`/api/training/programs/${program.id}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered }),
    });
    startTransition(() => router.refresh());
  }

  async function handleCreateSuperset(ids: string[]) {
    await fetch(`/api/training/programs/${program.id}/supersets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseIds: ids }),
    });
    startTransition(() => router.refresh());
  }

  async function handleRemoveSuperset(supersetId: string) {
    await fetch(`/api/training/programs/${program.id}/supersets`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supersetId }),
    });
    startTransition(() => router.refresh());
  }

  const allBlocks = program.blocks;
  const totalExercises = allBlocks.reduce((n, b) => n + b.exercises.length, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
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
        <div className="flex shrink-0 gap-1">
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

      {/* Exercise blocks */}
      {totalExercises === 0 ? (
        <div className="py-8 text-center text-[var(--text3)]">
          <Dumbbell className="mx-auto mb-2 h-8 w-8" />
          <p>Ingen øvelser ennå.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {allBlocks.map((block, blockIdx) => (
            <div key={`${block.programOrder}-${block.supersetId ?? "solo"}`}>
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
                    <ExerciseRow
                      key={ex.id}
                      ex={ex}
                      isFirst={blockIdx === 0 && exIdx === 0}
                      isLast={
                        blockIdx === allBlocks.length - 1 &&
                        exIdx === block.exercises.length - 1
                      }
                      onUpdate={(patch) => handleUpdateExercise(ex.id, patch)}
                      onRemove={() => handleRemoveExercise(ex.id)}
                      onMove={(dir) => handleMoveExercise(ex.id, dir)}
                      showDivider={exIdx < block.exercises.length - 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)]">
                  {block.exercises.map((ex) => (
                    <ExerciseRow
                      key={ex.id}
                      ex={ex}
                      isFirst={blockIdx === 0}
                      isLast={blockIdx === allBlocks.length - 1}
                      onUpdate={(patch) => handleUpdateExercise(ex.id, patch)}
                      onRemove={() => handleRemoveExercise(ex.id)}
                      onMove={(dir) => handleMoveExercise(ex.id, dir)}
                      showDivider={false}
                      canSuperset={
                        allBlocks.length > 1 &&
                        block.exercises.length === 1
                      }
                      adjacentId={
                        blockIdx + 1 < allBlocks.length &&
                        allBlocks[blockIdx + 1].type === "exercise"
                          ? allBlocks[blockIdx + 1].exercises[0].id
                          : null
                      }
                      onCreateSuperset={handleCreateSuperset}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add exercise */}
      <Link
        href={`/training/programs/${program.id}/add-exercise`}
        className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] py-4 text-[var(--text2)] active:bg-[var(--card)]"
      >
        <Plus className="h-5 w-5" />
        Legg til øvelse
      </Link>

      <div className="pb-2">
        <Link href="/training/programs" className="text-sm text-[var(--text3)] hover:text-[var(--text2)]">
          ← Tilbake til programmer
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exercise row in builder
// ---------------------------------------------------------------------------

interface ExerciseRowProps {
  ex: ProgramExerciseRow;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (patch: { sets?: number; reps?: number; restSeconds?: number; isBodyweight?: boolean }) => void;
  onRemove: () => void;
  onMove: (dir: "up" | "down") => void;
  showDivider: boolean;
  canSuperset?: boolean;
  adjacentId?: string | null;
  onCreateSuperset?: (ids: string[]) => void;
}

function ExerciseRow({
  ex,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMove,
  showDivider,
  canSuperset,
  adjacentId,
  onCreateSuperset,
}: ExerciseRowProps) {
  const [expanded, setExpanded] = useState(false);
  const name = ex.exerciseName;

  return (
    <div className={showDivider ? "border-b border-[var(--border)]" : ""}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium text-[var(--text1)]">{name}</span>
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
        <div className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3">
          {/* Sets / Reps / Rest */}
          <div className="grid grid-cols-3 gap-2">
            <Stepper label="Sett" value={ex.sets} min={1} max={20} onChange={(v) => onUpdate({ sets: v })} />
            <Stepper label="Reps" value={ex.reps} min={1} max={100} onChange={(v) => onUpdate({ reps: v })} />
            <Stepper label="Hvile (s)" value={ex.restSeconds} min={0} max={600} step={15} onChange={(v) => onUpdate({ restSeconds: v })} />
          </div>

          {/* Bodyweight toggle */}
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={ex.isBodyweight}
              onChange={(e) => onUpdate({ isBodyweight: e.target.checked })}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <span className="text-sm text-[var(--text2)]">Kroppsvekt</span>
          </label>

          {/* Controls */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => onMove("up")}
              disabled={isFirst}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-[var(--text3)] hover:bg-[var(--card2)] disabled:opacity-30"
            >
              <ChevronUp className="h-3 w-3" /> Opp
            </button>
            <button
              onClick={() => onMove("down")}
              disabled={isLast}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-[var(--text3)] hover:bg-[var(--card2)] disabled:opacity-30"
            >
              <ChevronDown className="h-3 w-3" /> Ned
            </button>
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
