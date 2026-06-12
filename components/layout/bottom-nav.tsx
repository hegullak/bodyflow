"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardPen, LayoutDashboard, Utensils, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/check-in", label: "Check-in", icon: ClipboardPen },
  { href: "/meals", label: "Meals", icon: Utensils },
  { href: "/statistics", label: "Stats", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[640px] items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors sm:text-xs",
                active
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-muted-foreground)]",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
