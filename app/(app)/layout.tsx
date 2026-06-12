import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { BottomNav } from "@/components/layout/bottom-nav";
import { requireUserId } from "@/lib/auth/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUserId();

  return (
    <div className="app-shell">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          bodyflow
        </Link>
        <UserButton />
      </header>
      <main className="app-content">{children}</main>
      <BottomNav />
    </div>
  );
}
