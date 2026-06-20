"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { useState, useTransition } from "react";
import { toggleScheduledSessionAction } from "@/lib/actions/schedule";
import { CARDIO_TYPES, RUN_IMAGE_URL } from "@/lib/training/cardio";
import { cn } from "@/lib/utils";

type Session = {
  id: string;
  date: string;
  programId: string | null;
  cardioSlug: string | null;
  isCompleted: boolean;
  completedAt: Date | null;
  notes: string | null;
};

type Program = { id: string; name: string };

function SessionCard({
  session,
  programs,
}: {
  session: Session;
  programs: Program[];
}) {
  const [completed, setCompleted] = useState(session.isCompleted);
  const [pending, startTransition] = useTransition();

  const isCardio = !!session.cardioSlug;
  const cardio = CARDIO_TYPES.find((c) => c.slug === session.cardioSlug);
  const program = programs.find((p) => p.id === session.programId);
  const label = cardio?.nameNo ?? program?.name ?? "Økt";

  function handleToggle() {
    setCompleted((v) => !v);
    startTransition(async () => {
      const res = await toggleScheduledSessionAction(session.id);
      if (!res.ok) setCompleted((v) => !v);
    });
  }

  if (isCardio) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors active:opacity-80",
          completed
            ? "border-[var(--green)]/30 bg-[var(--green-light)]"
            : "border-[var(--card-border)] bg-[var(--card)]",
        )}
      >
        <Image
          src={RUN_IMAGE_URL}
          alt="run"
          width={40}
          height={40}
          className="rounded-lg object-cover flex-shrink-0"
          unoptimized
        />
        <span className={cn(
          "flex-1 text-left text-sm font-medium",
          completed ? "text-[var(--green)]" : "text-[var(--text1)]",
        )}>
          {label}
        </span>
        <div className={cn(
          "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border transition-colors",
          completed ? "border-[var(--green)] bg-[var(--green)]" : "border-[var(--card-border)]",
        )}>
          {completed && <Check className="h-4 w-4 text-white" />}
        </div>
      </button>
    );
  }

  return (
    <Link
      href="/training/programs?start=1"
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors active:bg-[var(--card2)]",
        completed
          ? "border-[var(--green)]/30 bg-[var(--green-light)]"
          : "border-[var(--card-border)] bg-[var(--card)]",
      )}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10">
        <span className="text-lg">🏋️</span>
      </div>
      <span className={cn(
        "flex-1 text-sm font-medium",
        completed ? "text-[var(--green)]" : "text-[var(--text1)]",
      )}>
        {label}
      </span>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-[var(--text3)]" />
    </Link>
  );
}

export function TodaySessionsCard({
  sessions,
  programs,
}: {
  sessions: Session[];
  programs: Program[];
}) {
  if (sessions.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="px-1 text-xs font-semibold uppercase tracking-widest text-[var(--text3)]">
        Dagens økt
      </p>
      {sessions.map((s) => (
        <SessionCard key={s.id} session={s} programs={programs} />
      ))}
    </div>
  );
}
