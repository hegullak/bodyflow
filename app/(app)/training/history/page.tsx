"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Trash2, ChevronRight } from "lucide-react";

interface SessionItem {
  id: string;
  programName: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
}

function formatDateTime(d: string) {
  const date = new Date(d);
  return {
    date: new Intl.DateTimeFormat("nb-NO", { weekday: "short", day: "numeric", month: "short" }).format(date),
    time: new Intl.DateTimeFormat("nb-NO", { hour: "2-digit", minute: "2-digit" }).format(date),
  };
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}t ${m}m` : `${h}t`;
}

export default function TrainingHistoryPage() {
  const [history, setHistory] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/training/sessions/history")
      .then((r) => r.json())
      .then(setHistory)
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Slett denne treningsøkten?")) return;
    setDeleting(id);
    await fetch(`/api/training/sessions/${id}`, { method: "DELETE" });
    setHistory((prev) => prev.filter((s) => s.id !== id));
    setDeleting(null);
  }

  if (loading) {
    return (
      <div>
        <h1 className="page-title">Historikk</h1>
        <div className="flex flex-col gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-[var(--radius-md)] bg-[var(--card)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Historikk</h1>

      {history.length === 0 ? (
        <div className="py-12 text-center">
          <Clock className="mx-auto mb-3 h-10 w-10 text-[var(--text3)]" />
          <p className="text-[var(--text2)]">Ingen fullførte treningsøkter ennå.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {history.map((s) => {
            const { date, time } = formatDateTime(s.startedAt);
            return (
              <li key={s.id} className="flex items-center gap-2">
                <Link
                  href={`/training/history/${s.id}`}
                  className="flex flex-1 items-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] active:bg-[var(--card2)]"
                >
                  <div className="flex flex-1 items-center justify-between px-4 py-3 min-w-0">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--text1)] truncate">{s.programName}</p>
                      <p className="text-xs text-[var(--text3)] mt-0.5">
                        {date} · {time}
                        {s.durationMinutes !== null && (
                          <span className="ml-2 text-[var(--text2)]">· {formatDuration(s.durationMinutes)}</span>
                        )}
                      </p>
                      {s.endedAt === null && (
                        <span className="mt-1 inline-block rounded-full bg-[var(--green-light)] px-2 py-0.5 text-xs text-[var(--green)]">
                          Aktiv
                        </span>
                      )}
                    </div>
                    <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-[var(--text3)]" />
                  </div>
                </Link>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deleting === s.id}
                  className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-[var(--text3)] hover:bg-[var(--card2)] hover:text-[var(--red)] disabled:opacity-40 transition-colors"
                  aria-label="Slett økt"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
