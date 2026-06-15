export default function Loading() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <div className="h-7 w-48 rounded-[var(--radius-sm)] bg-[var(--card2)]" />
        <div className="flex gap-1">
          <div className="h-8 w-8 rounded-full bg-[var(--card2)]" />
          <div className="h-8 w-8 rounded-full bg-[var(--card2)]" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div className="h-4 w-40 rounded bg-[var(--card2)]" />
            <div className="mt-1.5 h-3 w-28 rounded bg-[var(--card2)]" />
          </div>
        ))}
      </div>

      <div className="h-14 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--card2)]" />
    </div>
  );
}
