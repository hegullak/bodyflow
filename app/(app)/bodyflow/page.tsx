import { BodyflowView } from "@/features/bodyflow/components/bodyflow-view";
import { requireUserId } from "@/lib/auth/current-user";
import { getBodyflowTrends } from "@/lib/queries/bodyflow";

export default async function BodyflowPage() {
  const userId = await requireUserId();
  const trends = await getBodyflowTrends(userId);

  return <BodyflowView trends={trends} />;
}
