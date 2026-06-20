import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUserId } from "@/lib/auth/current-user";
import { searchFoodsAdminAction } from "@/lib/actions/admin";
import { FoodTable } from "@/components/admin/food-table";

export default async function AdminFoodsPage() {
  await requireUserId();
  const initial = await searchFoodsAdminAction("", "all", 0, 50);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/admin" className="flex items-center gap-1 text-sm text-[var(--text2)]">
          <ChevronLeft className="h-4 w-4" /> Admin
        </Link>
        <h1 className="text-xl font-bold">Matvarer</h1>
      </div>
      <FoodTable initial={initial} initialSource="all" />
    </div>
  );
}
