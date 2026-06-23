import { notFound } from "next/navigation";
import { getMealItemByIdAction } from "@/features/nutrition/actions/meals";
import { MealItemDetail } from "@/features/nutrition/components/meal-item-detail";

export default async function MealItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const item = await getMealItemByIdAction(itemId);
  if (!item) notFound();

  return (
    <div>
      <MealItemDetail item={item} />
    </div>
  );
}
