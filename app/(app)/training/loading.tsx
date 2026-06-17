export default function Loading() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-7 w-32 rounded-[var(--radius-sm)] bg-[var(--card2)]" />

      <div className="h-20 rounded-[var(--radius-lg)] bg-[var(--card2)]" />

      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-5 py-4">
            <div className="h-5 w-5 rounded bg-[var(--card2)]" />
            <div className="flex flex-col gap-1.5">
              <div className="h-4 w-28 rounded bg-[var(--card2)]" />
              <div className="h-3 w-44 rounded bg-[var(--card2)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
