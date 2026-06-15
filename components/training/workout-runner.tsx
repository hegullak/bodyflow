"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Pause, Play, Plus, SkipForward, X } from "lucide-react";
import type { ActiveSession, CompletedSet } from "@/lib/training/sessions";
import type { ProgramBlock } from "@/lib/training/programs";

interface Props {
  session: ActiveSession;
}

// ---------------------------------------------------------------------------
// Rest Timer hook
// ---------------------------------------------------------------------------

function useRestTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback((duration: number) => {
    if (interval.current) clearInterval(interval.current);
    setSeconds(duration);
    setRunning(true);
  }, []);

  const pause = useCallback(() => setRunning((v) => !v), []);
  const skip = useCallback(() => { setRunning(false); setSeconds(0); }, []);
  const add15 = useCallback(() => setSeconds((v) => v + 15), []);

  useEffect(() => {
    if (!running) { if (interval.current) clearInterval(interval.current); return; }
    interval.current = setInterval(() => {
      setSeconds((v) => {
        if (v <= 1) { setRunning(false); return 0; }
        return v - 1;
      });
    }, 1000);
    return () => { if (interval.current) clearInterval(interval.current); };
  }, [running]);

  return { seconds, running, active: running || seconds > 0, start, pause, skip, add15 };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function WorkoutRunner({ session }: Props) {
  const router = useRouter();
  const timer = useRestTimer();
  const [completedSets, setCompletedSets] = useState<CompletedSet[]>(session.completedSets);
  const [ending, setEnding] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Elapsed time counter
  useEffect(() => {
    const started = new Date(session.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - started) / 1000));
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [session.startedAt]);

  function isSetDone(programExerciseId: string, setNumber: number) {
    return completedSets.some(
      (s) => s.programExerciseId === programExerciseId && s.setNumber === setNumber,
    );
  }

  async function toggleSet(
    programExerciseId: string,
    setNumber: number,
    restSeconds: number,
    block: ProgramBlock,
  ) {
    const done = isSetDone(programExerciseId, setNumber);

    if (done) {
      // Unlog
      setCompletedSets((prev) =>
        prev.filter((s) => !(s.programExerciseId === programExerciseId && s.setNumber === setNumber)),
      );
      await fetch(`/api/training/sessions/${session.id}/sets`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programExerciseId, setNumber }),
      });
      return;
    }

    // Log
    setCompletedSets((prev) => [...prev, { programExerciseId, setNumber }]);
    await fetch(`/api/training/sessions/${session.id}/sets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programExerciseId, setNumber }),
    });

    // For supersets: only start timer when all exercises in the block have their Nth set done
    if (block.type === "superset") {
      const updatedSets = [...completedSets, { programExerciseId, setNumber }];
      const allDone = block.exercises.every((ex) =>
        updatedSets.some(
          (s) => s.programExerciseId === ex.id && s.setNumber === setNumber,
        ),
      );
      if (allDone) timer.start(restSeconds);
    } else {
      timer.start(restSeconds);
    }
  }

  async function handleEnd() {
    if (!confirm("Avslutt økt?")) return;
    setEnding(true);
    await fetch(`/api/training/sessions/${session.id}`, { method: "PUT" });
    router.push("/training/history");
  }

  const elapsedStr = formatElapsed(elapsed);

  return (
    <div className="flex flex-col gap-4 pb-40">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text1)]">{session.programName}</h1>
          <p className="text-sm text-[var(--text3)]">{elapsedStr}</p>
        </div>
        <button
          onClick={handleEnd}
          disabled={ending}
          className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--text2)] hover:bg-[var(--card2)] disabled:opacity-50"
        >
          Avslutt
        </button>
      </div>

      {/* Exercise blocks */}
      {session.blocks.map((block) => (
        <div
          key={`${block.programOrder}-${block.supersetId ?? "solo"}`}
          className={`rounded-[var(--radius-md)] border bg-[var(--card)] ${
            block.type === "superset"
              ? "border-[var(--accent)]/30"
              : "border-[var(--border)]"
          }`}
        >
          {block.type === "superset" && (
            <div className="border-b border-[var(--border)] px-4 py-2">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">
                Supersett
              </span>
            </div>
          )}
          {block.exercises.map((ex, exIdx) => (
            <div
              key={ex.id}
              className={exIdx > 0 ? "border-t border-[var(--border)]" : ""}
            >
              <div className="px-4 pt-3 pb-1">
                <p className="font-medium text-[var(--text1)]">
                  {ex.exerciseName}
                </p>
                <p className="text-xs text-[var(--text3)]">
                  {ex.sets} sett × {ex.reps} reps
                  {ex.isBodyweight ? " · Kroppsvekt" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 px-4 pb-3 pt-2">
                {Array.from({ length: ex.sets }, (_, i) => i + 1).map((setNum) => {
                  const done = isSetDone(ex.id, setNum);
                  return (
                    <button
                      key={setNum}
                      onClick={() => toggleSet(ex.id, setNum, ex.restSeconds, block)}
                      className={`flex h-12 w-12 flex-col items-center justify-center rounded-[var(--radius-sm)] border transition-colors ${
                        done
                          ? "border-[var(--green)] bg-[var(--green-light)] text-[var(--green)]"
                          : "border-[var(--border)] bg-[var(--bg)] text-[var(--text3)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                      <span className="text-[10px] font-medium">{setNum}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}

      {session.blocks.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--text3)]">
          Dette programmet har ingen øvelser.
        </p>
      )}

      {/* Floating rest timer */}
      {timer.active && (
        <div className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]/95 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="flex-1">
              <p className="text-xs text-[var(--text3)]">Hvile</p>
              <p className="text-3xl font-bold tabular-nums text-[var(--text1)]">
                {formatTimer(timer.seconds)}
              </p>
            </div>
            <div className="flex gap-2">
              <TimerButton onClick={timer.add15} title="+15s">
                <Plus className="h-4 w-4" />
                <span className="text-xs">15</span>
              </TimerButton>
              <TimerButton onClick={timer.pause} title={timer.running ? "Pause" : "Fortsett"}>
                {timer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </TimerButton>
              <TimerButton onClick={timer.skip} title="Hopp over">
                <SkipForward className="h-4 w-4" />
              </TimerButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimerButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-10 w-10 flex-col items-center justify-center rounded-full border border-[var(--border)] text-[var(--text2)] hover:bg-[var(--card2)]"
    >
      {children}
    </button>
  );
}

function formatTimer(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function formatElapsed(s: number) {
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}t ${m % 60}m`;
}
