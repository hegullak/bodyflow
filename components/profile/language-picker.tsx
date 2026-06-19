"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { updateLanguageAction } from "@/lib/actions/profile";
import type { Lang } from "@/lib/i18n/types";

const OPTIONS: Array<{ lang: Lang; flag: string; label: string }> = [
  { lang: "no", flag: "🇳🇴", label: "Norsk" },
  { lang: "en", flag: "🇬🇧", label: "English" },
];

export function LanguagePicker({ current }: { current: Lang }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(lang: Lang) {
    if (lang === current || pending) return;
    startTransition(async () => {
      await updateLanguageAction(lang);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      {OPTIONS.map(({ lang, flag, label }) => (
        <button
          key={lang}
          type="button"
          disabled={pending}
          onClick={() => pick(lang)}
          aria-label={label}
          title={label}
          className={cn(
            "flex h-10 w-14 items-center justify-center rounded-[var(--radius-md)] border text-xl transition-all",
            current === lang
              ? "border-[var(--accent)] bg-[var(--accent)]/10 shadow-sm"
              : "border-[var(--border)] bg-[var(--card)] opacity-50 hover:opacity-80",
          )}
        >
          {flag}
        </button>
      ))}
    </div>
  );
}
