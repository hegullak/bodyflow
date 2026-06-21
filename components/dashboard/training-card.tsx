import { getT } from "@/lib/i18n/server";
import { Card, CardTitle, CardValue } from "@/components/ui/card";

export async function TrainingCard({ sessionsCount }: { sessionsCount: number }) {
  const t = await getT();
  const d = t.dashboard;

  return (
    <Card>
      <CardTitle>{d.trainingThisWeek}</CardTitle>
      <CardValue>{d.sessions(sessionsCount)}</CardValue>
    </Card>
  );
}
