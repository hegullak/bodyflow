import { getWithingsConnection } from "@/lib/withings/sync";
import { isWithingsConfigured } from "@/lib/withings/config";
import { requireUserId } from "@/lib/auth/current-user";
import Link from "next/link";

export async function WithingsHeaderBadge() {
  if (!isWithingsConfigured()) return null;

  const userId = await requireUserId();
  const connection = await getWithingsConnection(userId);

  if (!connection) return null;

  return (
    <Link
      href="/profile"
      title="Withings connected"
      className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card2)] px-2.5 py-1 text-[11px] font-medium text-[var(--text2)] transition-colors hover:text-[var(--text1)]"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
      Withings
    </Link>
  );
}
