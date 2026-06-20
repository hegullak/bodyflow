"use client";

import { recoveryColorHex } from "@/lib/calculations/recovery";

export function RecoveryPageGradient({ score }: { score: number }) {
  const color = recoveryColorHex(score);
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background: `radial-gradient(ellipse 80% 40% at 50% -10%, ${color}22 0%, transparent 70%)`,
      }}
    />
  );
}
