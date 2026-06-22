"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardPen, Dumbbell, LayoutDashboard, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  // Dashboard hidden for now — will redesign and enable later
  // { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/check-in", label: "Check-in", icon: ClipboardPen },
  { href: "/training", label: "Trening", icon: Dumbbell },
  { href: "/meals", label: "Meals", icon: Utensils },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-[2rem] border border-[var(--border)] bg-[var(--card)]/95 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-1 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ href, icon: Icon }) => {
          const active = href === "/training"
            ? pathname === "/training" || pathname.startsWith("/training/")
            : pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center justify-center transition-colors rounded-xl px-4 py-1.5",
                active
                  ? "text-[var(--accent)]"
                  : "text-[var(--text3)] hover:text-[var(--text2)]",
              )}
              title={href}
            >
              <Icon className="h-6 w-6" strokeWidth={1.5} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
