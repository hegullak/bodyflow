import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUserId } from "@/lib/auth/current-user";
import { searchExercisesAdminAction } from "@/lib/actions/admin";
import { ExerciseTable } from "@/components/admin/exercise-table";

export default async function AdminExercisesPage() {
  await requireUserId();
  const initial = await searchExercisesAdminAction("", 0, 50);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/admin" className="flex items-center gap-1 text-sm text-[var(--text2)]">
          <ChevronLeft className="h-4 w-4" /> Admin
        </Link>
        <h1 className="text-xl font-bold">Treningsøvelser</h1>
      </div>
      <ExerciseTable initial={initial} />
    </div>
  );
}
