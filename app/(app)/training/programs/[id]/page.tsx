import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth/current-user";
import { getProgram } from "@/lib/training/programs";
import { getActiveSession } from "@/lib/training/sessions";
import { ProgramBuilder } from "@/components/training/program-builder";

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const [program, activeSession] = await Promise.all([
    getProgram(id, userId),
    getActiveSession(userId),
  ]);
  if (!program) notFound();

  const activeSessionId = activeSession?.programId === id ? activeSession.id : null;

  return (
    <div>
      <ProgramBuilder program={program} activeSessionId={activeSessionId} />
    </div>
  );
}
