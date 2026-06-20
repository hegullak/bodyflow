import { headers } from "next/headers";
import Link from "next/link";
import { requireUserId } from "@/lib/auth/current-user";

function isMobileUA(ua: string): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

export default async function AdminPage() {
  await requireUserId();
  const hdrs = await headers();
  const ua = hdrs.get("user-agent") ?? "";
  const isMobile = isMobileUA(ua);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">Admin</h1>

      {isMobile && (
        <div className="mt-4 rounded-lg border border-[var(--amber)] bg-[var(--amber-light)] px-4 py-3 text-sm text-[var(--text1)]">
          Denne seksjonen er optimalisert for desktop. Noen funksjoner kan fungere, men tabellene er enklere å bruke på en større skjerm.
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/exercises"
          className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-5 transition-colors hover:border-[var(--accent)]"
        >
          <p className="text-base font-semibold">Treningsøvelser</p>
          <p className="mt-1 text-sm text-[var(--text2)]">
            Rediger engelske og norske navn. Eksporter til CSV, JSON eller Excel.
          </p>
        </Link>

        <Link
          href="/admin/foods"
          className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-5 transition-colors hover:border-[var(--accent)]"
        >
          <p className="text-base font-semibold">Matvarer</p>
          <p className="mt-1 text-sm text-[var(--text2)]">
            Rediger prettyName for Kassal og Matvaretabellen. Eksporter til CSV, JSON eller Excel.
          </p>
        </Link>
      </div>
    </div>
  );
}
