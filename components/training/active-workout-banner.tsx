"use client";

import Link from "next/link";
import { Play } from "lucide-react";

export function ActiveWorkoutBanner({ programName }: { programName: string }) {
  return (
    <Link
      href="/training/workout"
      className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--green)]/40 bg-[var(--green-light)] px-4 py-3"
    >
      <Play className="h-4 w-4 shrink-0 fill-[var(--green)] text-[var(--green)]" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--green)]">Aktiv økt pågår</p>
        <p className="truncate text-xs text-[var(--green)]/80">{programName}</p>
      </div>
    </Link>
  );
}
