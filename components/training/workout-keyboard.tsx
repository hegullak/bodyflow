"use client";

import React from "react";
import { Minus, Plus } from "lucide-react";

export interface WorkoutKeyboardProps {
  field: "weight" | "reps";
  onKey: (k: string) => void;
  onNext: () => void;
  onPlus: () => void;
  onMinus: () => void;
  onDismiss: () => void;
}

export const WorkoutKeyboard = React.memo(function WorkoutKeyboard({
  field,
  onKey,
  onNext,
  onPlus,
  onMinus,
  onDismiss,
}: WorkoutKeyboardProps) {
  const numBtn =
    "flex h-11 items-center justify-center rounded-lg bg-[var(--card2)] text-base font-semibold text-[var(--text1)] active:opacity-60 select-none";
  const smBtn =
    "flex h-11 items-center justify-center rounded-lg bg-[var(--card2)] text-xs font-medium text-[var(--text2)] active:opacity-60 select-none";

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
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
            <button
              key={k}
              onPointerDown={(e) => { e.preventDefault(); onKey(k); }}
              className={numBtn}
            >
              {k}
            </button>
          ))}
          <button
            onPointerDown={(e) => { e.preventDefault(); if (field === "weight") onKey("."); }}
            className={`${numBtn} ${field === "reps" ? "opacity-30" : ""}`}
          >
            .
          </button>
          <button onPointerDown={(e) => { e.preventDefault(); onKey("0"); }} className={numBtn}>
            0
          </button>
          <button onPointerDown={(e) => { e.preventDefault(); onKey("⌫"); }} className={numBtn}>
            ⌫
          </button>
        </div>

        {/* Right panel */}
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
