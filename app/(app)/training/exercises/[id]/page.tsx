import { notFound } from "next/navigation";
import Link from "next/link";
import { getExerciseById } from "@/lib/exercises/catalog";
import { requireUserId } from "@/lib/auth/current-user";

export default async function ExerciseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUserId();
  const { id } = await params;
  const exercise = await getExerciseById(id);
  if (!exercise) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title">{exercise.name}</h1>
        {exercise.nameEn !== exercise.name && (
          <p className="text-sm text-[var(--text3)]">{exercise.nameEn}</p>
        )}
      </div>

      {/* Meta chips */}
      <div className="flex flex-wrap gap-2">
        {exercise.bodyPart && (
          <Chip label="Kroppsdel" value={exercise.bodyPart.name} />
        )}
        {exercise.targetMuscle && (
          <Chip label="Muskel" value={exercise.targetMuscle.name} />
        )}
        {exercise.equipment && (
          <Chip label="Utstyr" value={exercise.equipment} />
        )}
      </div>

      {/* Secondary muscles */}
      {exercise.secondaryMuscles.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text3)]">
            Sekundære muskler
          </p>
          <div className="flex flex-wrap gap-1">
            {exercise.secondaryMuscles.map((m) => (
              <span
                key={m.slug}
                className="rounded-full bg-[var(--card)] px-2 py-0.5 text-xs text-[var(--text2)]"
              >
                {m.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* GIF */}
      {exercise.imageUrl && (
        <div className="overflow-hidden rounded-[var(--radius-md)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={exercise.imageUrl}
            alt={exercise.name}
            className="w-full"
            loading="lazy"
          />
        </div>
      )}

      {/* Instructions */}
      {exercise.instructions.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text3)]">
            Instruksjoner
          </p>
          <ol className="flex flex-col gap-2">
            {exercise.instructions.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-light)] text-xs font-medium text-[var(--accent)]">
                  {i + 1}
                </span>
                <p className="text-sm text-[var(--text2)]">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <Link href="/training/exercises" className="text-sm text-[var(--text3)] hover:text-[var(--text2)]">
        ← Tilbake til øvelser
      </Link>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-[var(--card)] px-3 py-2">
      <p className="text-xs text-[var(--text3)]">{label}</p>
      <p className="text-sm font-medium text-[var(--text1)] capitalize">{value}</p>
    </div>
  );
}
