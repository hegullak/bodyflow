import Link from "next/link";
import { Dumbbell, BookOpen, Library, History } from "lucide-react";
import { requireUserId } from "@/lib/auth/current-user";
import { getActiveSession } from "@/lib/training/sessions";
import { ActiveWorkoutBanner } from "@/components/training/active-workout-banner";

export default async function TrainingPage() {
  const userId = await requireUserId();
  const activeSession = await getActiveSession(userId);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="page-title">Trening</h1>

      {activeSession && (
        <ActiveWorkoutBanner programName={activeSession.programName} />
      )}

      <Link
        href="/training/programs?start=1"
        className="flex items-center justify-center gap-3 rounded-[var(--radius-lg)] bg-[var(--accent)] py-6 text-[var(--bg)] shadow-lg active:opacity-90"
      >
        <Dumbbell className="h-6 w-6" />
        <span className="text-xl font-semibold">Start økt</span>
      </Link>

      <div className="grid grid-cols-1 gap-3">
        <Link
          href="/training/programs"
          className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-5 py-4 active:bg-[var(--card2)]"
        >
          <BookOpen className="h-5 w-5 text-[var(--accent)]" />
          <div>
            <p className="font-medium text-[var(--text1)]">Programmer</p>
            <p className="text-sm text-[var(--text3)]">Bygg og administrer treningsprogrammer</p>
          </div>
        </Link>

        <Link
          href="/training/exercises"
          className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-5 py-4 active:bg-[var(--card2)]"
        >
          <Library className="h-5 w-5 text-[var(--accent)]" />
          <div>
            <p className="font-medium text-[var(--text1)]">Øvelsesoversikt</p>
            <p className="text-sm text-[var(--text3)]">Søk i 1500+ øvelser</p>
          </div>
        </Link>

        <Link
          href="/training/history"
          className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-5 py-4 active:bg-[var(--card2)]"
        >
          <History className="h-5 w-5 text-[var(--accent)]" />
          <div>
            <p className="font-medium text-[var(--text1)]">Historikk</p>
            <p className="text-sm text-[var(--text3)]">Se tidligere treningsøkter</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
