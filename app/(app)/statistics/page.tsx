import { StatisticsView } from "@/components/statistics/statistics-view";
import { requireUserId } from "@/lib/auth/current-user";
import { getStatisticsData } from "@/lib/queries/statistics";

export default async function StatisticsPage() {
  const userId = await requireUserId();
  const data = await getStatisticsData(userId);

  return (
    <div>
      <h1 className="page-title">Statistics</h1>
      <p className="page-subtitle">
        Monthly and yearly averages for weight and body measurements since 2020.
      </p>
      <StatisticsView data={data} />
    </div>
  );
}
