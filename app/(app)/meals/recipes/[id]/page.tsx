import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth/current-user";
import { getRecipeDetail } from "@/lib/recipes";
import { RecipeEditor } from "@/components/recipes/recipe-editor";

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();
  const recipe = await getRecipeDetail(id, userId);
  if (!recipe) notFound();

  return <RecipeEditor initial={recipe} />;
}
