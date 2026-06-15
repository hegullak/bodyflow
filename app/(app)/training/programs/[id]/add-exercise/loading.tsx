export default function Loading() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      <div className="mb-1 flex items-center justify-between">
        <div className="h-4 w-40 rounded bg-[var(--card2)]" />
        <div className="h-8 w-8 rounded-full bg-[var(--card2)]" />
      </div>

      <div className="h-9 rounded-[var(--radius-md)] bg-[var(--card2)]" />

      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-6 w-14 rounded-full bg-[var(--card2)]" />
        ))}
      </div>

      <div className="flex flex-col gap-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-11 rounded-[var(--radius-sm)] bg-[var(--card2)]" />
        ))}
      </div>
    </div>
  );
}
