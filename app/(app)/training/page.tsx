import Link from "next/link";
import { Dumbbell, BookOpen, Library, History, CalendarDays } from "lucide-react";
import { requireUserId } from "@/lib/auth/current-user";
import { getActiveSession } from "@/lib/training/sessions";
import { ActiveWorkoutBanner } from "@/components/training/active-workout-banner";
import { RecoveryBattery } from "@/components/ui/recovery-battery";
import { RecoveryPageGradient } from "@/components/ui/recovery-page-gradient";
import { getT, getLang } from "@/lib/i18n/server";
import { getDashboardData } from "@/lib/queries/dashboard";
import { calcRecoveryScore } from "@/lib/calculations/recovery";

export default async function TrainingPage() {
  const userId = await requireUserId();
  const [activeSession, t, lang, data] = await Promise.all([
    getActiveSession(userId),
    getT(),
    getLang(),
    getDashboardData(userId),
  ]);
  const tr = t.training;

  const score = calcRecoveryScore({
    strengthSessionsThisWeek: data.weekSessionsCount,
    completedCardioSlugs: data.weekCompletedCardioSlugs,
    weekAvgCalories: data.weekAvgCalories,
    dailyCalorieTarget: data.dailyCalorieTarget,
  });

  const MAX_SUSTAINABLE_LOAD = 6.0;
  const strengthLoad = data.weekSessionsCount * 1.3;
  const cardioLoad   = data.weekCompletedCardioSlugs.reduce((s, slug) => {
    const w: Record<string, number> = { longrun: 2.0, "4x4-interval": 1.5, "tempo-run": 1.2, interval: 1.0 };
    return s + (w[slug] ?? 1.0);
  }, 0);
  const totalLoad = strengthLoad + cardioLoad;
  const trainingHigh = totalLoad / MAX_SUSTAINABLE_LOAD > 0.6;
  const caloriesLow  =
    data.weekAvgCalories != null &&
    data.dailyCalorieTarget != null &&
    data.weekAvgCalories < data.dailyCalorieTarget + totalLoad * 200 * 0.85;

  return (
    <div className="relative">
      <RecoveryPageGradient score={score} />

      <div className="relative z-10 flex flex-col gap-4">
        <h1 className="page-title">{tr.title}</h1>

        <RecoveryBattery
          score={score}
          trainingHigh={trainingHigh}
          caloriesLow={caloriesLow}
          lang={lang}
        />

        {activeSession && <ActiveWorkoutBanner programName={activeSession.programName} />}

        <Link
          href="/training/programs?start=1"
          className="flex items-center justify-center gap-3 rounded-[var(--radius-lg)] bg-[var(--accent)] py-6 text-[var(--bg)] shadow-lg active:opacity-90"
        >
          <Dumbbell className="h-6 w-6" />
          <span className="text-xl font-semibold">{tr.startSession}</span>
        </Link>

        <div className="grid grid-cols-1 gap-3">
          <Link
            href="/training/planner"
            className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-5 py-4 active:bg-[var(--card2)]"
          >
            <CalendarDays className="h-5 w-5 text-[var(--accent)]" />
            <div>
              <p className="font-medium text-[var(--text1)]">Planlegger</p>
              <p className="text-sm text-[var(--text3)]">Planlegg uken og måneden</p>
            </div>
          </Link>

          <Link
            href="/training/programs"
            className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-5 py-4 active:bg-[var(--card2)]"
          >
            <BookOpen className="h-5 w-5 text-[var(--accent)]" />
            <div>
              <p className="font-medium text-[var(--text1)]">{tr.programs}</p>
              <p className="text-sm text-[var(--text3)]">{tr.programsDesc}</p>
            </div>
          </Link>

          <Link
            href="/training/exercises"
            className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-5 py-4 active:bg-[var(--card2)]"
          >
            <Library className="h-5 w-5 text-[var(--accent)]" />
            <div>
              <p className="font-medium text-[var(--text1)]">{tr.exercises}</p>
              <p className="text-sm text-[var(--text3)]">{tr.exercisesDesc}</p>
            </div>
          </Link>

          <Link
            href="/training/history"
            className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-5 py-4 active:bg-[var(--card2)]"
          >
            <History className="h-5 w-5 text-[var(--accent)]" />
            <div>
              <p className="font-medium text-[var(--text1)]">{tr.history}</p>
              <p className="text-sm text-[var(--text3)]">{tr.historyDesc}</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
