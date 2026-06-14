import { requireUserId } from "@/lib/auth/current-user";
import { getProgram } from "@/lib/training/programs";
import { notFound } from "next/navigation";
import { ExercisePicker } from "@/components/training/exercise-picker";

export default async function AddExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const program = await getProgram(id, userId);
  if (!program) notFound();

  return (
    <div>
      <h1 className="page-title">Legg til øvelse</h1>
      <p className="mb-4 text-sm text-[var(--text3)]">Program: {program.name}</p>
      <ExercisePicker programId={id} />
    </div>
  );
}
