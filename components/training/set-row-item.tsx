"use client";

import React from "react";
import { Check, Trash2 } from "lucide-react";
import { useT } from "@/components/providers/lang-provider";
import type { LastSetRow } from "@/lib/training/sessions";
import type { SetRow } from "@/lib/training/set-utils";
import { fmtTimer } from "@/lib/training/set-utils";

export interface SetRowItemProps {
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

export const SetRowItem = React.memo(function SetRowItem({
  idx,
  row,
  last: _last,
  isBodyweight,
  isNextSet,
  isResting,
  timerSeconds,
  isActiveWeight,
  isActiveReps,
  activeValue,
  activeSelected: _activeSelected,
  onActivateSet,
  onToggle,
  onRemoveSet,
  onFocusWeight,
  onFocusReps,
}: SetRowItemProps) {
  const t = useT();
  const weightDisplay = isActiveWeight ? activeValue : (row.weightKg ? String(row.weightKg) : "");
  const repsDisplay = isActiveReps ? activeValue : (row.reps ? String(row.reps) : "");
  const isActive = isActiveWeight || isActiveReps;

  return (
    <div
      className={`grid grid-cols-[3rem_5rem_4.5rem_1fr_3.5rem_2.5rem] items-center px-3 border-l-2 transition-colors ${
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
      {/* Set number — full-height tap target to activate timer */}
      <div
        onPointerDown={() => onActivateSet()}
        className="flex min-h-[2.75rem] cursor-pointer flex-col items-center justify-center"
      >
        {isResting ? (
          <>
            <span className="text-[8px] font-bold uppercase leading-none text-[var(--green)]">
              {t.workout.restLabel}
            </span>
            <span className="text-xs font-bold tabular-nums text-[var(--green)]">
              {fmtTimer(timerSeconds)}
            </span>
          </>
        ) : isNextSet ? (
          <span className="text-xs font-bold text-[var(--accent)]">{t.workout.go}</span>
        ) : (
          <span className="text-sm font-semibold text-[var(--text3)]">{idx + 1}</span>
        )}
      </div>

      {/* KG / bodyweight */}
      {isBodyweight ? (
        <p className="text-sm font-medium text-[var(--text2)]">BW</p>
      ) : (
        <div
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onFocusWeight(); }}
          className={`flex h-8 items-center justify-end rounded px-1 text-sm font-medium cursor-pointer ${
            isActiveWeight ? "bg-[var(--accent)] text-white" : "text-[var(--text1)]"
          }`}
        >
          {weightDisplay || <span className="opacity-30">—</span>}
        </div>
      )}

      {/* Reps */}
      <div
        onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onFocusReps(); }}
        className={`flex h-8 items-center justify-end rounded px-1 text-sm font-medium cursor-pointer ${
          isActiveReps ? "bg-[var(--accent)] text-white" : "text-[var(--text1)]"
        }`}
      >
        {repsDisplay || <span className="opacity-30">—</span>}
      </div>

      {/* Spacer */}
      <div />

      {/* Complete button */}
      <button
        onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onToggle(); }}
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

      {/* Delete button — far right */}
      <button
        onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onRemoveSet(); }}
        className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--red)]/50 transition-colors active:text-[var(--red)]"
        title="Slett sett"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
});
