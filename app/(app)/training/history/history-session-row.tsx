"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteTrainingSessionAction, type TrainingSession } from "@/features/training/actions";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";

interface HistorySessionRowProps {
  session: TrainingSession;
  deleteLabel: string;
  deleteConfirm: string;
}

export function HistorySessionRow({ session, deleteLabel, deleteConfirm }: HistorySessionRowProps) {
  const router = useRouter();
  const [deleting, startDelete] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleDelete() {
    startDelete(async () => {
      await deleteTrainingSessionAction(session.id);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={deleting}
        className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-[var(--text3)] hover:bg-[var(--card2)] hover:text-[var(--red)] disabled:opacity-40 transition-colors"
        aria-label={deleteLabel}
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <ConfirmSheet
        open={showConfirm}
        message={deleteConfirm}
        onConfirm={() => { setShowConfirm(false); handleDelete(); }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
