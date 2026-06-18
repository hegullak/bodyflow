import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Clock, Dumbbell } from "lucide-react";
import { requireUserId } from "@/lib/auth/current-user";
import { getSessionDetail } from "@/lib/training/sessions";

function formatDateTime(d: Date) {
  return {
    date: new Intl.DateTimeFormat("nb-NO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d),
    time: new Intl.DateTimeFormat("nb-NO", { hour: "2-digit", minute: "2-digit" }).format(d),
  };
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}t ${m}m` : `${h}t`;
}

function formatWeight(weightKg: number | null, isBodyweight: boolean) {
  if (isBodyweight) return "Kroppsvekt";
  if (weightKg == null) return "—";
  return `${weightKg} kg`;
}

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();
  const session = await getSessionDetail(id, userId);

  if (!session) notFound();

  const { date, time } = formatDateTime(session.startedAt);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/training/history"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text2)] hover:bg-[var(--card2)]"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="page-title mb-0">{session.programName}</h1>
      </div>

      <div className="mb-6 flex items-center gap-4 text-sm text-[var(--text3)]">
        <span>{date} · {time}</span>
        {session.durationMinutes !== null && (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(session.durationMinutes)}
          </span>
        )}
      </div>

      {session.exercises.length === 0 ? (
        <div className="py-12 text-center">
          <Dumbbell className="mx-auto mb-3 h-10 w-10 text-[var(--text3)]" />
          <p className="text-[var(--text2)]">Ingen sett logget i denne økten.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {session.exercises.map((ex) => (
            <div key={ex.exerciseName} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <p className="font-medium text-[var(--text1)]">{ex.exerciseName}</p>
                <p className="text-xs text-[var(--text3)] mt-0.5">{ex.sets.length} sett</p>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {ex.sets.map((s) => (
                  <div key={s.setNumber} className="grid grid-cols-3 px-4 py-2.5 text-sm">
                    <span className="text-[var(--text3)]">Sett {s.setNumber}</span>
                    <span className="text-center text-[var(--text1)]">{formatWeight(s.weightKg, s.isBodyweight)}</span>
                    <span className="text-right text-[var(--text1)]">
                      {s.reps != null ? `${s.reps} reps` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
