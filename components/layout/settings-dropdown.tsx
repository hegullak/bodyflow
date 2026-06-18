"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BarChart3, LogOut, Settings, Wifi, WifiOff } from "lucide-react";

export function SettingsDropdown({ withingsConnected }: { withingsConnected: boolean }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--card2)] border border-[var(--border)] transition-colors hover:bg-[var(--card)] overflow-hidden"
        aria-label="Settings"
      >
        {user?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Settings className="h-4 w-4 text-[var(--text2)]" strokeWidth={1.5} />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-56 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-xl">
          {user && (
            <div className="border-b border-[var(--border)] px-3 py-2.5">
              <p className="text-sm font-medium text-[var(--text1)] truncate">
                {user.fullName ?? user.username ?? "Account"}
              </p>
              <p className="text-xs text-[var(--text3)] truncate">
                {user.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          )}

          <div className="p-1">
            <div className="flex items-center gap-2 px-2 py-2 rounded-[var(--radius-sm)]">
              {withingsConnected ? (
                <Wifi className="h-4 w-4 text-[var(--green)]" strokeWidth={1.5} />
              ) : (
                <WifiOff className="h-4 w-4 text-[var(--text3)]" strokeWidth={1.5} />
              )}
              <span className="text-sm text-[var(--text2)]">
                Withings {withingsConnected ? "connected" : "not connected"}
              </span>
            </div>

            <button
              onClick={() => { setOpen(false); router.push("/profile"); }}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-2 text-sm text-[var(--text1)] hover:bg-[var(--card2)] transition-colors"
            >
              <Settings className="h-4 w-4 text-[var(--text3)]" strokeWidth={1.5} />
              Profile & settings
            </button>

            <button
              onClick={() => { setOpen(false); router.push("/statistics"); }}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-2 text-sm text-[var(--text1)] hover:bg-[var(--card2)] transition-colors"
            >
              <BarChart3 className="h-4 w-4 text-[var(--text3)]" strokeWidth={1.5} />
              Statistics
            </button>

            <button
              onClick={() => signOut({ redirectUrl: "/" })}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-2 text-sm text-[var(--red)] hover:bg-[var(--red-light)] transition-colors"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
