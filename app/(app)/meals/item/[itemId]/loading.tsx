export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-4 w-20 rounded bg-[var(--card2)]" />

      <div>
        <div className="h-7 w-48 rounded bg-[var(--card2)]" />
        <div className="mt-1.5 h-3.5 w-32 rounded bg-[var(--card2)]" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
          <div className="h-3 w-16 rounded bg-[var(--card2)]" />
          <div className="mt-2 h-10 w-28 rounded bg-[var(--card2)]" />
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
          <div className="h-3 w-16 rounded bg-[var(--card2)]" />
          <div className="mt-2 h-10 w-24 rounded bg-[var(--card2)]" />
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
          <div className="h-3 w-36 rounded bg-[var(--card2)]" />
          <div className="mt-3 flex flex-col gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3.5 w-24 rounded bg-[var(--card2)]" />
                <div className="h-3.5 w-16 rounded bg-[var(--card2)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
