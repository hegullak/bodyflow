import Link from "next/link";
import { X } from "lucide-react";
import { ExerciseLibrary } from "@/features/training/components/exercise-library";

export default function ExercisesPage() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="page-title mb-0">Exercises</h1>
        <Link
          href="/training"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--red)] hover:bg-[var(--red-light)]"
        >
          <X className="h-5 w-5" />
        </Link>
      </div>
      <ExerciseLibrary />
    </div>
  );
}
