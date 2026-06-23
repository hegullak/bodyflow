import Link from "next/link";
import { Clock, ChevronRight } from "lucide-react";
import { getTranslations } from "@/lib/i18n";
import { getTrainingHistoryAction } from "@/features/training/actions";
import { HistorySessionRow } from "./history-session-row";

function formatDateTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
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

export default async function TrainingHistoryPage() {
  const t = getTranslations("no");
  const tr = t.training;
  const history = await getTrainingHistoryAction();

  return (
    <div>
      <h1 className="page-title">{tr.history}</h1>

      {history.length === 0 ? (
        <div className="py-12 text-center">
          <Clock className="mx-auto mb-3 h-10 w-10 text-[var(--text3)]" />
          <p className="text-[var(--text2)]">{tr.noCompletedSessions}</p>
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
                          {tr.active}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-[var(--text3)]" />
                  </div>
                </Link>
                <HistorySessionRow session={s} deleteLabel={tr.deleteSessionAria} deleteConfirm={tr.deleteSessionConfirm} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
