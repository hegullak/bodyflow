import { requireUserId } from "@/lib/auth/current-user";
import { getProgramMeta } from "@/features/training/programs";
import { notFound } from "next/navigation";
import { ExercisePicker } from "@/features/training/components/exercise-picker";

export default async function AddExercisePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const userId = await requireUserId();
  const { id } = await params;
  const { from } = await searchParams;
  const program = await getProgramMeta(id, userId);
  if (!program) notFound();

  return (
    <div>
      <h1 className="page-title">Add exercises</h1>
      <ExercisePicker
        programId={id}
        programName={program.name}
        returnTo={from === "workout" ? "/training/workout" : undefined}
      />
    </div>
  );
}
