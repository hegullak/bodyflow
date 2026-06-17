export default function Loading() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-7 w-36 rounded-[var(--radius-sm)] bg-[var(--card2)]" />

      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
          <div className="h-3.5 w-28 rounded bg-[var(--card2)]" />
          <div className="mt-2 h-9 w-full rounded bg-[var(--card2)]" />
        </div>
      ))}

      <div className="h-11 w-full rounded-[var(--radius-md)] bg-[var(--card2)]" />
    </div>
  );
}
