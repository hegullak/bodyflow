export default function Loading() {
  return (
    <div>
      <div className="mb-4 h-8 w-48 animate-pulse rounded bg-[var(--card)]" />
      <div className="mb-6 h-4 w-64 animate-pulse rounded bg-[var(--card)]" />
      <div className="flex flex-col gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-[var(--radius-md)] bg-[var(--card)]" />
        ))}
      </div>
    </div>
  );
}
