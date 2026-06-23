"use client";

import React, { useState } from "react";
import { Dumbbell, Minus, Play, Plus } from "lucide-react";
import { useT } from "@/components/providers/lang-provider";
import type { ProgramExerciseRow } from "../programs";
import { fmtTimer } from "../set-utils";

export interface RestTimerBarProps {
  seconds: number;
  running: boolean;
  nextExercise: ProgramExerciseRow | null;
  nextSetIdx: number | null;
  onAdd: (n: number) => void;
  onPause: () => void;
  onSkip: () => void;
  onAutoNext: () => void;
}

export const RestTimerBar = React.memo(function RestTimerBar({
  seconds,
  running,
  nextExercise,
  nextSetIdx,
  onAdd,
  onPause,
  onSkip,
  onAutoNext,
}: RestTimerBarProps) {
  const t = useT();
  const [nextImgError, setNextImgError] = useState(false);

  return (
    <div
      className="fixed left-4 right-4 z-[200] overflow-hidden rounded-3xl border border-[var(--accent)]/40 bg-[var(--card)] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
      style={{ bottom: "calc(6.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
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
            {nextSetIdx !== null && ` – sett ${nextSetIdx + 1}`}
          </p>
          <button
            onClick={onAutoNext}
            className="flex items-center gap-0.5 rounded-full bg-[var(--accent)]/20 px-3 py-1.5 text-xs font-semibold text-[var(--accent)] active:bg-[var(--accent)]/30"
            title="Auto-fullfør neste sett"
          >
            <Play className="h-3 w-3 fill-current" />
            <Play className="-ml-1 h-3 w-3 fill-current" />
          </button>
        </div>
      )}
    </div>
  );
});
