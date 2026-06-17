export default function Loading() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-[var(--card2)]" />
        <div className="flex-1">
          <div className="h-5 w-44 rounded bg-[var(--card2)]" />
          <div className="mt-1 h-3 w-16 rounded bg-[var(--card2)]" />
        </div>
        <div className="h-8 w-20 rounded-full bg-[var(--card2)]" />
      </div>

      {/* Exercise cards */}
      {[1, 2].map((i) => (
        <div key={i} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="h-12 w-12 rounded-full bg-[var(--card2)]" />
            <div className="flex flex-col gap-1.5">
              <div className="h-4 w-36 rounded bg-[var(--card2)]" />
              <div className="h-3 w-28 rounded bg-[var(--card2)]" />
            </div>
          </div>
          <div className="border-t border-[var(--border)]">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center gap-4 border-t border-[var(--border)] px-4 py-2.5">
                <div className="h-4 w-4 rounded bg-[var(--card2)]" />
                <div className="flex-1 h-3 w-20 rounded bg-[var(--card2)]" />
                <div className="h-7 w-12 rounded bg-[var(--card2)]" />
                <div className="h-7 w-10 rounded bg-[var(--card2)]" />
                <div className="h-7 w-7 rounded-full bg-[var(--card2)]" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
