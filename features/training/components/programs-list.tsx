"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Play, Plus, Dumbbell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { useT } from "@/components/providers/lang-provider";
import { deleteProgramAction } from "../actions";

interface Program {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: Date;
}

interface Props {
  programs: Program[];
  startMode: boolean;
  activeSessionProgramId: string | null;
}

export function ProgramsList({ programs, startMode, activeSessionProgramId }: Props) {
  const t = useT();
  const tr = t.training;
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [programList, setProgramList] = useState(programs);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/training/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const prog = await res.json();
        router.push(`/training/programs/${prog.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  async function doDelete(programId: string) {
    setDeleting(programId);
    try {
      await deleteProgramAction(programId);
      setProgramList((prev) => prev.filter((p) => p.id !== programId));
    } finally {
      setDeleting(null);
    }
  }

  async function handleStart(programId: string, hasActiveFromThis: boolean) {
    if (hasActiveFromThis) {
      router.push("/training/workout");
      return;
    }
    setStarting(programId);
    try {
      const res = await fetch("/api/training/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId }),
      });
      if (res.ok) {
        router.push("/training/workout");
      }
    } finally {
      setStarting(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {programs.length === 0 ? (
        <div className="py-12 text-center">
          <Dumbbell className="mx-auto mb-3 h-10 w-10 text-[var(--text3)]" />
          <p className="text-[var(--text2)]">Ingen programmer ennå.</p>
          <p className="text-sm text-[var(--text3)]">Lag ditt første program nedenfor.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {programList.map((p) => {
            const isActive = p.id === activeSessionProgramId;
            return (
              <li key={p.id} className="relative">
                {startMode ? (
                  <button
                    onClick={() => handleStart(p.id, isActive)}
                    disabled={starting === p.id}
                    className="flex w-full items-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] text-left active:bg-[var(--card2)] disabled:opacity-60"
                  >
                    <div className={`flex w-12 shrink-0 items-center justify-center self-stretch ${isActive ? "bg-[var(--green)]" : "bg-[var(--accent)]"}`}>
                      {isActive ? (
                        <span className="relative flex h-4 w-4 items-center justify-center">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
                          <Play className="relative h-4 w-4 fill-white text-white" />
                        </span>
                      ) : (
                        <Play className="h-5 w-5 fill-white text-white" />
                      )}
                    </div>
                    <div className="flex flex-1 items-center justify-between px-4 py-4">
                      <div>
                        <p className="font-medium text-[var(--text1)]">{p.name}</p>
                        {isActive && (
                          <p className="text-xs font-medium text-[var(--green)]">{tr.continueActiveSession}</p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-[var(--text3)]" />
                    </div>
                  </button>
                ) : (
                  <Link
                    href={`/training/programs/${p.id}`}
                    className="flex w-full items-center justify-between px-4 py-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] active:bg-[var(--card2)]"
                  >
                    <div>
                      <p className="font-medium text-[var(--text1)]">{p.name}</p>
                      {isActive && (
                        <p className="text-xs text-[var(--green)]">{tr.activeSession}</p>
                      )}
                    </div>
                  </Link>
                )}
                <button
                  onClick={() => setDeleteConfirm({ id: p.id, name: p.name })}
                  disabled={deleting === p.id}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full text-[var(--text3)] hover:bg-[var(--red-light)] hover:text-[var(--red)] transition-colors disabled:opacity-40"
                  title="Slett program"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {showForm ? (
        <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] p-4">
          <input
            autoFocus
            placeholder="Programnavn, f.eks. Push A"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text1)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
          />
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="flex-1">
              {creating ? tr.creatingProgram : tr.createProgram}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setNewName(""); }}>
              {t.common.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] py-4 text-[var(--text2)] active:bg-[var(--card)]"
        >
          <Plus className="h-5 w-5" />
          {tr.newProgram}
        </button>
      )}

      <ConfirmSheet
        open={!!deleteConfirm}
        message={`Slett "${deleteConfirm?.name}"?`}
        onConfirm={() => { const id = deleteConfirm!.id; setDeleteConfirm(null); void doDelete(id); }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
