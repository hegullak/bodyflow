export default function Loading() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-7 w-32 rounded-[var(--radius-sm)] bg-[var(--card2)]" />

      {/* Search bar */}
      <div className="h-11 w-full rounded-[var(--radius-md)] bg-[var(--card2)]" />

      {/* Results list */}
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div className="h-4 w-40 rounded bg-[var(--card2)]" />
            <div className="mt-1.5 h-3 w-24 rounded bg-[var(--card2)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
