import { GymaholicImportView } from "@/features/training/components/gymaholic-import-view";
import { requireUserId } from "@/lib/auth/current-user";

export default async function TrainingImportPage() {
  await requireUserId();

  return (
    <div className="space-y-3">
      <div>
        <h1 className="page-title">Import Workouts</h1>
        <p className="text-xs text-[var(--text3)]">
          Import your historical workout data from Gymaholic
        </p>
      </div>

      <GymaholicImportView />
    </div>
  );
}
