import { getComebackMessage } from "@/lib/inactivity";

export function ComebackBanner({ lastActivityDate }: { lastActivityDate?: string | null }) {
  const comeback = getComebackMessage(lastActivityDate);
  if (!comeback) return null;

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-4">
      <p className="text-sm font-semibold text-[var(--text1)]">{comeback.title}</p>
      <p className="mt-2 text-sm text-[var(--text2)]">{comeback.slogan}</p>
    </div>
  );
}
