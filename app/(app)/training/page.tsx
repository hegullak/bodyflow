import Link from "next/link";
import { Dumbbell, BookOpen, Library, History, CalendarDays } from "lucide-react";
import { requireUserId } from "@/lib/auth/current-user";
import { getActiveSession } from "@/features/training/sessions";
import { ActiveWorkoutBanner } from "@/features/training/components/active-workout-banner";
import { getT } from "@/lib/i18n/server";

export default async function TrainingPage() {
  const userId = await requireUserId();
  const [activeSession, t] = await Promise.all([
    getActiveSession(userId),
    getT(),
  ]);
  const tr = t.training;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="page-title">{tr.title}</h1>

      {activeSession && <ActiveWorkoutBanner programName={activeSession.programName} />}

      <Link
        href="/training/programs?start=1"
        className="flex items-center justify-center gap-3 rounded-[var(--radius-lg)] bg-[var(--accent)] py-6 text-[var(--bg)] shadow-lg active:opacity-90"
      >
        <Dumbbell className="h-6 w-6" />
        <span className="text-xl font-semibold">{tr.startSession}</span>
      </Link>

      <div className="grid grid-cols-1 gap-3">
        <Link href="/training/planner" className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-5 py-4 active:bg-[var(--card2)]">
          <CalendarDays className="h-5 w-5 text-[var(--accent)]" />
          <div>
            <p className="font-medium text-[var(--text1)]">Planlegger</p>
            <p className="text-sm text-[var(--text3)]">Planlegg uken og måneden</p>
          </div>
        </Link>

        <Link href="/training/programs" className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-5 py-4 active:bg-[var(--card2)]">
          <BookOpen className="h-5 w-5 text-[var(--accent)]" />
          <div>
            <p className="font-medium text-[var(--text1)]">{tr.programs}</p>
            <p className="text-sm text-[var(--text3)]">{tr.programsDesc}</p>
          </div>
        </Link>

        <Link href="/training/exercises" className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-5 py-4 active:bg-[var(--card2)]">
          <Library className="h-5 w-5 text-[var(--accent)]" />
          <div>
            <p className="font-medium text-[var(--text1)]">{tr.exercises}</p>
            <p className="text-sm text-[var(--text3)]">{tr.exercisesDesc}</p>
          </div>
        </Link>

        <Link href="/training/history" className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-5 py-4 active:bg-[var(--card2)]">
          <History className="h-5 w-5 text-[var(--accent)]" />
          <div>
            <p className="font-medium text-[var(--text1)]">{tr.history}</p>
            <p className="text-sm text-[var(--text3)]">{tr.historyDesc}</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
