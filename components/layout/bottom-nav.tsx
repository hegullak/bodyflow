"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[640px] items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                active
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-muted-foreground)]",
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
