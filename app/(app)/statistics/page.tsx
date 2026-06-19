import { StatisticsView } from "@/components/statistics/statistics-view";
import { requireUserId } from "@/lib/auth/current-user";
import { getStatisticsData } from "@/lib/queries/statistics";
import { getT } from "@/lib/i18n/server";

export default async function StatisticsPage() {
  const userId = await requireUserId();
  const [data, t] = await Promise.all([getStatisticsData(userId), getT()]);

  return (
    <div>
      <h1 className="page-title">{t.statistics.title}</h1>
      <p className="page-subtitle">{t.statistics.subtitle}</p>
      <StatisticsView data={data} />
    </div>
  );
}
