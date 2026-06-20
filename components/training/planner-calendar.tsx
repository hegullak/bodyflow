"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Check, Trash2, Plus, X } from "lucide-react";
import {
  getScheduledSessionsForMonth,
  getScheduledSessionsForRange,
  addScheduledSessionAction,
  toggleScheduledSessionAction,
  deleteScheduledSessionAction,
} from "@/lib/actions/schedule";
import { CARDIO_TYPES, RUN_IMAGE_URL, type CardioSlug } from "@/lib/training/cardio";
import { cn } from "@/lib/utils";

type Session = {
  id: string;
  date: string;
  programId: string | null;
  cardioSlug: string | null;
  isCompleted: boolean;
  completedAt: Date | null;
  notes: string | null;
};

type Program = { id: string; name: string };

function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sessionLabel(s: Session, programs: Program[]): string {
  if (s.cardioSlug) {
    return CARDIO_TYPES.find((c) => c.slug === s.cardioSlug)?.nameNo ?? s.cardioSlug;
  }
  return programs.find((p) => p.id === s.programId)?.name ?? "Økt";
}

// ── Day sheet ──────────────────────────────────────────────────────────────

function DaySheet({
  date,
  sessions,
  programs,
  onClose,
  onChanged,
}: {
  date: string;
  sessions: Session[];
  programs: Program[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const label = new Date(date + "T12:00:00").toLocaleDateString("nb-NO", {
    weekday: "long", day: "numeric", month: "long",
  });

  function handleToggle(id: string) {
    startTransition(async () => {
      await toggleScheduledSessionAction(id);
      onChanged();
    });
  }

  function handleDelete(id: string) {
    setDeletingId(null);
    startTransition(async () => {
      await deleteScheduledSessionAction(id);
      onChanged();
    });
  }

  function handleAddProgram(programId: string) {
    setAdding(false);
    startTransition(async () => {
      await addScheduledSessionAction(date, { programId });
      onChanged();
    });
  }

  function handleAddCardio(slug: CardioSlug) {
    setAdding(false);
    startTransition(async () => {
      await addScheduledSessionAction(date, { cardioSlug: slug });
      onChanged();
    });
  }

  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-[var(--card)] border-t border-[var(--border)] pb-8">
        {/* drag pill */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-[var(--border)]" />
        </div>

        <div className="flex items-center justify-between px-4 py-2">
          <p className="font-semibold capitalize text-[var(--text1)]">{label}</p>
          <button onClick={onClose} className="p-1 text-[var(--text3)]"><X className="h-5 w-5" /></button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-4 pb-2 space-y-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                s.isCompleted
                  ? "border-[var(--green)]/30 bg-[var(--green-light)]"
                  : "border-[var(--card-border)] bg-[var(--card2)]",
              )}
            >
              {s.cardioSlug && (
                <Image src={RUN_IMAGE_URL} alt="run" width={36} height={36} className="rounded-lg object-cover flex-shrink-0" unoptimized />
              )}
              <span className="flex-1 text-sm font-medium">{sessionLabel(s, programs)}</span>

              {deletingId === s.id ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-xs text-[var(--red)] font-medium"
                    disabled={pending}
                  >Slett</button>
                  <button onClick={() => setDeletingId(null)} className="text-xs text-[var(--text3)]">Avbryt</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(s.id)}
                    disabled={pending}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border transition-colors",
                      s.isCompleted
                        ? "border-[var(--green)] bg-[var(--green)] text-white"
                        : "border-[var(--card-border)] text-[var(--text3)]",
                    )}
                  >
                    {s.isCompleted && <Check className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setDeletingId(s.id)}
                    className="p-1 text-[var(--text3)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Add picker */}
          {adding ? (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text3)]">Programmer</p>
              {programs.length === 0 && (
                <p className="text-sm text-[var(--text3)]">Ingen programmer ennå</p>
              )}
              {programs.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleAddProgram(p.id)}
                  disabled={pending}
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card2)] px-3 py-2.5 text-sm font-medium text-[var(--text1)] active:bg-[var(--card)]"
                >
                  {p.name}
                </button>
              ))}

              <p className="pt-1 text-xs font-semibold uppercase tracking-widest text-[var(--text3)]">Løping</p>
              {CARDIO_TYPES.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => handleAddCardio(c.slug)}
                  disabled={pending}
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card2)] px-3 py-2.5 active:bg-[var(--card)]"
                >
                  <Image src={RUN_IMAGE_URL} alt="run" width={32} height={32} className="rounded object-cover flex-shrink-0" unoptimized />
                  <span className="text-sm font-medium text-[var(--text1)]">{c.nameNo}</span>
                </button>
              ))}

              <button
                onClick={() => setAdding(false)}
                className="w-full py-2 text-sm text-[var(--text3)]"
              >
                Avbryt
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] py-3 text-sm text-[var(--text2)] active:bg-[var(--card2)]"
            >
              <Plus className="h-4 w-4" />
              Legg til økt
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main calendar component ─────────────────────────────────────────────────

type View = "month" | "week";

export function PlannerCalendar({
  initialSessions,
  programs,
  today,
  initialYear,
  initialMonth,
}: {
  initialSessions: Session[];
  programs: Program[];
  today: string;
  initialYear: number;
  initialMonth: number;
}) {
  const [view, setView] = useState<View>("month");
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth); // 1-indexed
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();

  // week state: ISO date of Mon
  const todayDate = new Date(today + "T12:00:00");
  const dow = todayDate.getDay();
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const monDate = new Date(todayDate);
  monDate.setDate(monDate.getDate() - daysFromMon);
  const [weekMon, setWeekMon] = useState(monDate);

  function reload(y: number, m: number) {
    startLoad(async () => {
      const data = await getScheduledSessionsForMonth(y, m);
      setSessions(data as Session[]);
    });
  }

  function reloadWeek(mon: Date) {
    startLoad(async () => {
      const fri = new Date(mon);
      fri.setDate(fri.getDate() + 6);
      const data = await getScheduledSessionsForRange(localIso(mon), localIso(fri));
      setSessions(data as Session[]);
    });
  }

  function prevMonth() {
    const nm = month === 1 ? 12 : month - 1;
    const ny = month === 1 ? year - 1 : year;
    setMonth(nm); setYear(ny); reload(ny, nm);
  }
  function nextMonth() {
    const nm = month === 12 ? 1 : month + 1;
    const ny = month === 12 ? year + 1 : year;
    setMonth(nm); setYear(ny); reload(ny, nm);
  }
  function prevWeek() {
    const mon = new Date(weekMon); mon.setDate(mon.getDate() - 7);
    setWeekMon(mon); reloadWeek(mon);
  }
  function nextWeek() {
    const mon = new Date(weekMon); mon.setDate(mon.getDate() + 7);
    setWeekMon(mon); reloadWeek(mon);
  }

  function sessionsFor(date: string) {
    return sessions.filter((s) => s.date === date);
  }

  const monthNames = ["Januar","Februar","Mars","April","Mai","Juni","Juli","August","September","Oktober","November","Desember"];
  const dayNames = ["Man","Tir","Ons","Tor","Fre","Lør","Søn"];

  // Build month grid
  function buildMonthDays() {
    const first = new Date(year, month - 1, 1);
    const startDow = first.getDay(); // 0=Sun
    const offset = startDow === 0 ? 6 : startDow - 1; // Mon=0
    const days: (string | null)[] = Array(offset).fill(null);
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }

  // Build week days
  function buildWeekDays() {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekMon); d.setDate(d.getDate() + i);
      return localIso(d);
    });
  }

  const selectedSessions = selectedDate ? sessionsFor(selectedDate) : [];

  // Week label
  const weekEnd = new Date(weekMon); weekEnd.setDate(weekEnd.getDate() + 6);
  const weekLabel = `${weekMon.getDate()}. ${monthNames[weekMon.getMonth()].slice(0,3).toLowerCase()} – ${weekEnd.getDate()}. ${monthNames[weekEnd.getMonth()].slice(0,3).toLowerCase()}`;

  return (
    <div className={loading ? "opacity-70 pointer-events-none" : ""}>
      {/* View toggle */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex rounded-lg border border-[var(--card-border)] overflow-hidden">
          {(["month", "week"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                view === v ? "bg-[var(--accent)] text-[var(--card)]" : "text-[var(--text2)]",
              )}
            >
              {v === "month" ? "Måned" : "Uke"}
            </button>
          ))}
        </div>
      </div>

      {view === "month" ? (
        <>
          {/* Month nav */}
          <div className="mb-3 flex items-center justify-between">
            <button onClick={prevMonth} className="p-1 text-[var(--text2)]"><ChevronLeft className="h-5 w-5" /></button>
            <p className="font-semibold text-[var(--text1)]">{monthNames[month - 1]} {year}</p>
            <button onClick={nextMonth} className="p-1 text-[var(--text2)]"><ChevronRight className="h-5 w-5" /></button>
          </div>

          {/* Day headers */}
          <div className="mb-1 grid grid-cols-7 text-center">
            {dayNames.map((d) => (
              <div key={d} className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {buildMonthDays().map((iso, i) => {
              if (!iso) return <div key={i} />;
              const ss = sessionsFor(iso);
              const isToday = iso === today;
              const completed = ss.length > 0 && ss.every((s) => s.isCompleted);
              const partial = ss.length > 0 && ss.some((s) => s.isCompleted) && !completed;
              return (
                <button
                  key={iso}
                  onClick={() => setSelectedDate(iso)}
                  className={cn(
                    "flex flex-col items-center rounded-lg py-1.5 transition-colors active:bg-[var(--card2)]",
                    isToday && "bg-[var(--accent)]/10",
                    selectedDate === iso && "ring-1 ring-[var(--accent)]",
                  )}
                >
                  <span className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-sm",
                    isToday ? "bg-[var(--accent)] text-white font-bold" : "text-[var(--text1)]",
                  )}>
                    {Number(iso.split("-")[2])}
                  </span>
                  {ss.length > 0 && (
                    <div className="mt-0.5 flex gap-0.5">
                      {ss.slice(0, 3).map((s) => (
                        <div
                          key={s.id}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            s.isCompleted ? "bg-[var(--green)]" : s.cardioSlug ? "bg-[#BE5228]" : "bg-[var(--accent)]",
                          )}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Week nav */}
          <div className="mb-3 flex items-center justify-between">
            <button onClick={prevWeek} className="p-1 text-[var(--text2)]"><ChevronLeft className="h-5 w-5" /></button>
            <p className="text-sm font-semibold text-[var(--text1)]">{weekLabel}</p>
            <button onClick={nextWeek} className="p-1 text-[var(--text2)]"><ChevronRight className="h-5 w-5" /></button>
          </div>

          {/* Week columns */}
          <div className="space-y-2">
            {buildWeekDays().map((iso, i) => {
              const ss = sessionsFor(iso);
              const isToday = iso === today;
              const dayNum = Number(iso.split("-")[2]);
              return (
                <button
                  key={iso}
                  onClick={() => setSelectedDate(iso)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors active:bg-[var(--card2)]",
                    isToday ? "border-[var(--accent)]/40 bg-[var(--accent)]/5" : "border-[var(--card-border)] bg-[var(--card)]",
                    selectedDate === iso && "ring-1 ring-[var(--accent)]",
                  )}
                >
                  <div className="flex flex-col items-center min-w-[36px]">
                    <span className="text-[10px] font-semibold uppercase text-[var(--text3)]">{dayNames[i]}</span>
                    <span className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                      isToday ? "bg-[var(--accent)] text-white" : "text-[var(--text1)]",
                    )}>
                      {dayNum}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-1 pt-0.5">
                    {ss.length === 0 ? (
                      <span className="text-xs text-[var(--text3)]">Ingen økt</span>
                    ) : ss.map((s) => (
                      <div key={s.id} className="flex items-center gap-2">
                        {s.cardioSlug && (
                          <Image src={RUN_IMAGE_URL} alt="run" width={22} height={22} className="rounded object-cover flex-shrink-0" unoptimized />
                        )}
                        <span className={cn(
                          "text-sm",
                          s.isCompleted ? "text-[var(--green)]" : "text-[var(--text1)]",
                        )}>
                          {sessionLabel(s, programs)}
                        </span>
                        {s.isCompleted && <Check className="h-3.5 w-3.5 text-[var(--green)] flex-shrink-0" />}
                      </div>
                    ))}
                  </div>
                  <Plus className="h-4 w-4 flex-shrink-0 text-[var(--text3)] mt-1.5" />
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Day sheet */}
      {selectedDate && (
        <DaySheet
          date={selectedDate}
          sessions={selectedSessions}
          programs={programs}
          onClose={() => setSelectedDate(null)}
          onChanged={() => {
            setSelectedDate(null);
            if (view === "month") reload(year, month);
            else reloadWeek(weekMon);
          }}
        />
      )}
    </div>
  );
}
