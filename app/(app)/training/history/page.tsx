import { requireUserId } from "@/lib/auth/current-user";
import { getSessionHistory } from "@/lib/training/sessions";
import { Calendar, Clock } from "lucide-react";

export default async function TrainingHistoryPage() {
  const userId = await requireUserId();
  const history = await getSessionHistory(userId);

  function formatDate(d: Date) {
    return new Intl.DateTimeFormat("nb-NO", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(d));
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
          {history.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-5 py-4"
            >
              <div>
                <p className="font-medium text-[var(--text1)]">{s.programName}</p>
                <div className="flex items-center gap-2 text-xs text-[var(--text3)]">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(s.startedAt)}</span>
                </div>
              </div>
              {s.durationMinutes !== null && (
                <div className="flex items-center gap-1 text-sm text-[var(--text2)]">
                  <Clock className="h-4 w-4" />
                  <span>{s.durationMinutes} min</span>
                </div>
              )}
              {s.endedAt === null && (
                <span className="rounded-full bg-[var(--green-light)] px-2 py-0.5 text-xs text-[var(--green)]">
                  Aktiv
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
