export default function Loading() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-7 w-28 rounded-[var(--radius-sm)] bg-[var(--card2)]" />

      {/* Calorie summary bar */}
      <div className="h-14 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card2)]" />

      {/* Meal sections */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] p-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="h-4 w-24 rounded bg-[var(--card2)]" />
              <div className="h-3 w-16 rounded bg-[var(--card2)]" />
            </div>
            <div className="h-8 w-20 rounded-[var(--radius-sm)] bg-[var(--card2)]" />
          </div>
          <div className="mt-2 border-t border-[var(--border)] pt-2 flex flex-col gap-2">
            <div className="h-9 w-full rounded bg-[var(--card2)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
