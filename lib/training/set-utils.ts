import type { ProgramBlock } from "@/lib/training/programs";
import type { CompletedSet, LastSetRow } from "@/lib/training/sessions";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface SetRow {
  weightKg: number;
  reps: number;
  completed: boolean;
}

export type SetsMap = Map<string, SetRow[]>;

export interface ActiveInput {
  exId: string;
  setIdx: number;
  field: "weight" | "reps";
  value: string;
  selected: boolean;
}

// ---------------------------------------------------------------------------
// State initialisation
// ---------------------------------------------------------------------------

export function initSets(
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
// Drag-and-drop helpers (shared with program-builder)
// ---------------------------------------------------------------------------

export function blockDragId(block: ProgramBlock): string {
  return block.exercises[0].id;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

export function fmtTimer(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function fmtElapsed(s: number): string {
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
