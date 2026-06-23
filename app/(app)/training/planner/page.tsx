import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { requireUserId } from "@/lib/auth/current-user";
import { getScheduledSessionsForMonth } from "@/lib/actions/schedule";
import { listPrograms } from "@/features/training/programs";
import { PlannerCalendar } from "@/features/training/components/planner-calendar";

function localIsoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function PlannerPage() {
  const userId = await requireUserId();
  const today = localIsoToday();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [sessions, programs] = await Promise.all([
    getScheduledSessionsForMonth(year, month),
    listPrograms(userId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/training" className="p-1 text-[var(--text2)]">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="page-title">Planlegger</h1>
      </div>

      <PlannerCalendar
        initialSessions={sessions as Parameters<typeof PlannerCalendar>[0]["initialSessions"]}
        programs={programs}
        today={today}
        initialYear={year}
        initialMonth={month}
      />
    </div>
  );
}
