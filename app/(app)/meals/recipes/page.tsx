import Link from "next/link";
import { ChevronLeft, ChevronRight, UtensilsCrossed } from "lucide-react";
import { requireUserId } from "@/lib/auth/current-user";
import { listRecipes } from "@/lib/recipes";
import { NewRecipeButton } from "@/features/nutrition/components/new-recipe-button";

export default async function RecipesPage() {
  const userId = await requireUserId();
  const recipeList = await listRecipes(userId);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/meals"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text2)] hover:bg-[var(--card2)]"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="page-title mb-0">Oppskrifter</h1>
      </div>

      <div className="flex flex-col gap-3">
        {recipeList.length === 0 ? (
          <div className="py-12 text-center">
            <UtensilsCrossed className="mx-auto mb-3 h-10 w-10 text-[var(--text3)]" />
            <p className="text-[var(--text2)]">Ingen oppskrifter ennå.</p>
            <p className="text-sm text-[var(--text3)]">Lag din første oppskrift nedenfor.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {recipeList.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/meals/recipes/${r.id}`}
                  className="flex items-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] active:bg-[var(--card2)]"
                >
                  <div className="flex flex-1 items-center justify-between px-4 py-3 min-w-0">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--text1)] truncate">{r.name}</p>
                      <p className="text-xs text-[var(--text3)] mt-0.5">
                        {Math.round(r.kcalPer100g)} kcal/100g · {r.ingredientCount} ingredienser
                      </p>
                    </div>
                    <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-[var(--text3)]" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <NewRecipeButton />
      </div>
    </div>
  );
}
