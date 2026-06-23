"use client";

import React, { useState } from "react";
import { Dumbbell, Link2, Plus, Trash2 } from "lucide-react";
import type { ProgramExerciseRow } from "../programs";
import type { LastSetRow } from "../sessions";
import type { SetRow, ActiveInput } from "../set-utils";
import { SetRowItem } from "./set-row-item";

export interface ExerciseCardProps {
  ex: ProgramExerciseRow;
  setRows: SetRow[];
  lastSets: LastSetRow[];
  nextSetIdx: number;
  timerActive: boolean;
  restingSetIdx: number;
  timerSeconds: number;
  activeInput: ActiveInput | null;
  isSuperset: boolean;
  isLastExercise: boolean;
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

export const ExerciseCard = React.memo(function ExerciseCard({
  ex,
  setRows,
  lastSets,
  nextSetIdx,
  timerActive,
  restingSetIdx,
  timerSeconds,
  activeInput,
  isSuperset,
  isLastExercise,
  onToggle,
  onActivateSet,
  onWeight: _onWeight,
  onReps: _onReps,
  onFocusInput,
  onAddSet,
  onRemoveSet,
  onRemoveExercise: _onRemoveExercise,
  onToggleSupersetMode,
  onThumbClick,
}: ExerciseCardProps) {
  const [imgError, setImgError] = useState(false);
  const name = ex.exerciseName;
  const meta = [ex.categoryName, ex.targetMuscleName].filter(Boolean).join(" · ");

  return (
    <div className="overflow-hidden">
      {/* Exercise name + thumbnail + delete button */}
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
        <button
          onClick={_onRemoveExercise}
          className="shrink-0 rounded-full p-2 text-[var(--text3)] hover:bg-[var(--red-light)] hover:text-[var(--red)] transition-colors"
          title="Slett øvelse"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Column headers: [set-nr | kg | reps | spacer | check | delete] */}
      <div className="grid grid-cols-[3rem_5rem_4.5rem_1fr_3.5rem_2.5rem] items-center px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
        <span className="text-center">Set</span>
        <span className="pr-1 text-right">{ex.isBodyweight ? "BW" : "kg"}</span>
        <span className="pr-1 text-right">Reps</span>
        <span /><span /><span />
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
        {!isLastExercise && (
          <button
            onClick={onToggleSupersetMode}
            className={`flex items-center gap-1 text-sm font-medium transition-colors ${
              isSuperset ? "text-[var(--accent)]" : "text-[var(--text2)] hover:text-[var(--text1)]"
            }`}
            title={isSuperset ? "Superset aktivt" : "Aktiver superset"}
          >
            <Link2 className="h-4 w-4" />
            Superset
          </button>
        )}
      </div>
    </div>
  );
});
