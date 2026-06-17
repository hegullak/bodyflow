export default function Loading() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-7 w-28 rounded-[var(--radius-sm)] bg-[var(--card2)]" />

      {[1, 2].map((i) => (
        <div key={i} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="h-4 w-32 rounded bg-[var(--card2)]" />
          <div className="mt-3 h-40 w-full rounded bg-[var(--card2)]" />
        </div>
      ))}
    </div>
  );
}
