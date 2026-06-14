import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth/current-user";
import { getProgram } from "@/lib/training/programs";
import { ProgramBuilder } from "@/components/training/program-builder";

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const program = await getProgram(id, userId);
  if (!program) notFound();

  return (
    <div>
      <ProgramBuilder program={program} />
    </div>
  );
}
