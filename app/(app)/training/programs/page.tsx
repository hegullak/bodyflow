import { requireUserId } from "@/lib/auth/current-user";
import { listPrograms } from "@/lib/training/programs";
import { getActiveSession } from "@/lib/training/sessions";
import { ProgramsList } from "@/components/training/programs-list";

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const startMode = params.start === "1";

  const [programs, activeSession] = await Promise.all([
    listPrograms(userId),
    getActiveSession(userId),
  ]);

  return (
    <div>
      <h1 className="page-title">{startMode ? "Velg program" : "Programmer"}</h1>
      <ProgramsList
        programs={programs}
        startMode={startMode}
        activeSessionProgramId={activeSession?.programId ?? null}
      />
    </div>
  );
}
