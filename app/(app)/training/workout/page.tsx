import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/current-user";
import { getActiveSession } from "@/lib/training/sessions";
import { WorkoutRunner } from "@/components/training/workout-runner";

export default async function WorkoutPage() {
  const userId = await requireUserId();
  const session = await getActiveSession(userId);

  if (!session) {
    redirect("/training/programs?start=1");
  }

  return <WorkoutRunner session={session} />;
}
