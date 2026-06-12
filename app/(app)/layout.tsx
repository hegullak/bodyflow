import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ReminderSync } from "@/components/reminders/reminder-sync";
import { requireUserId } from "@/lib/auth/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUserId();

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link href="/dashboard" className="text-base font-semibold tracking-tight">
          bodyflow
        </Link>
        <UserButton />
      </header>
      <main className="app-content">{children}</main>
      <ReminderSync />
      <BottomNav />
    </div>
  );
}
