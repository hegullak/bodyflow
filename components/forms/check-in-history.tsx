"use client";

import { useState, useTransition, useRef } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { CheckInSnapshot, CheckInDiff } from "@/lib/queries/check-in";
import {
  upsertCheckInAction,
  getCheckInHistoryPageAction,
  deleteCheckInAction,
} from "@/lib/actions/check-in";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { formatWeekdayDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 5;
const REVEAL_W = 112;
const SNAP = 40;

function computeDiff(cur: CheckInSnapshot, prev: CheckInSnapshot | null): CheckInDiff | null {
  if (!prev) return null;
  const r = (a: number | null, b: number | null) =>
    a != null && b != null ? Math.round((a - b) * 10) / 10 : null;
  const d = {
    weightKg: r(cur.weightKg, prev.weightKg),
    waistCm: r(cur.waistCm, prev.waistCm),
    chestCm: r(cur.chestCm, prev.chestCm),
    hipCm: r(cur.hipCm, prev.hipCm),
  };
  if (Object.values(d).every((v) => v === null)) return null;
  return d;
}

type Part = { label: string; value: number; dv: number | null };

function SummaryLine({ entry, diff }: { entry: CheckInSnapshot; diff: CheckInDiff | null }) {
  const parts: Part[] = (
    [
      { label: "V", value: entry.weightKg, dv: diff?.weightKg ?? null },
      { label: "M", value: entry.waistCm, dv: diff?.waistCm ?? null },
      { label: "B", value: entry.chestCm, dv: diff?.chestCm ?? null },
      { label: "H", value: entry.hipCm, dv: diff?.hipCm ?? null },
    ] as Array<{ label: string; value: number | null; dv: number | null }>
  ).filter((p): p is Part => p.value != null);

  if (parts.length === 0) return <p className="mt-0.5 text-xs text-[var(--text3)]">—</p>;

  return (
    <p className="mt-0.5 text-xs leading-relaxed">
      {parts.map((p, i) => {
        const hasDiff = p.dv != null && p.dv !== 0;
        const sign = p.dv != null && p.dv > 0 ? "+" : "";
        const tone =
          p.dv != null && p.dv > 0
            ? "text-[#9a5b45]"
            : p.dv != null && p.dv < 0
              ? "text-[var(--color-primary)]"
              : "text-[var(--text2)]";
        return (
          <span key={p.label} className={tone}>
            {i > 0 && <span className="text-[var(--text3)]"> · </span>}
            {p.label} {p.value}
            {hasDiff && ` (${sign}${p.dv})`}
          </span>
        );
      })}
    </p>
  );
}

function SwipeRow({
  entry,
  diff,
  onEditOpen,
  onDeleted,
}: {
  entry: CheckInSnapshot;
  diff: CheckInDiff | null;
  onEditOpen: () => void;
  onDeleted: () => void;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [deleting, startDelete] = useTransition();
  const sw = useRef({ startX: 0, startY: 0, tracking: false, revealed: false, dragging: false });

  function snap(x: number, animate = true) {
    const el = innerRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 0.2s ease" : "none";
    el.style.transform = `translateX(${x}px)`;
    sw.current.revealed = x < 0;
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    sw.current = { ...sw.current, startX: e.clientX, startY: e.clientY, tracking: true, dragging: false };
    innerRef.current?.setPointerCapture(e.pointerId);
    if (innerRef.current) innerRef.current.style.transition = "none";
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!sw.current.tracking) return;
    const dx = e.clientX - sw.current.startX;
    const dy = e.clientY - sw.current.startY;
    if (!sw.current.dragging) {
      if (Math.abs(dy) > Math.abs(dx) + 5) { sw.current.tracking = false; return; }
      if (Math.abs(dx) > 5) sw.current.dragging = true;
      else return;
    }
    e.preventDefault();
    const base = sw.current.revealed ? -REVEAL_W : 0;
    const x = Math.max(-REVEAL_W, Math.min(0, base + dx));
    if (innerRef.current) innerRef.current.style.transform = `translateX(${x}px)`;
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!sw.current.tracking || !sw.current.dragging) { sw.current.tracking = false; return; }
    sw.current.tracking = false;
    const dx = e.clientX - sw.current.startX;
    const base = sw.current.revealed ? -REVEAL_W : 0;
    snap(base + dx < -SNAP ? -REVEAL_W : 0);
  }

  function handleDelete() {
    snap(0);
    startDelete(async () => {
      await deleteCheckInAction(entry.logDate);
      onDeleted();
    });
  }

  function handleEdit() {
    snap(0);
    setTimeout(onEditOpen, 200);
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex" style={{ width: REVEAL_W }}>
        <button
          type="button"
          onClick={handleEdit}
          className="flex w-14 items-center justify-center bg-blue-500 text-white active:opacity-80"
          aria-label="Rediger"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex w-14 items-center justify-center bg-[var(--red)] text-white active:opacity-80 disabled:opacity-50"
          aria-label="Slett"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={innerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="relative bg-[var(--card)] px-4 py-3 select-none"
        style={{ touchAction: "pan-y", transform: "translateX(0)" }}
      >
        <p className="text-sm font-medium text-[var(--text1)]">{formatWeekdayDate(entry.logDate)}</p>
        <SummaryLine entry={entry} diff={diff} />
      </div>
    </div>
  );
}

function EditSheet({
  entry,
  onClose,
  onSaved,
}: {
  entry: CheckInSnapshot;
  onClose: () => void;
  onSaved: (updated: CheckInSnapshot) => void;
}) {
  const [saving, startSave] = useTransition();
  const [fields, setFields] = useState({
    weightKg: entry.weightKg != null ? String(entry.weightKg) : "",
    waistCm: entry.waistCm != null ? String(entry.waistCm) : "",
    chestCm: entry.chestCm != null ? String(entry.chestCm) : "",
    hipCm: entry.hipCm != null ? String(entry.hipCm) : "",
  });

  function set(key: keyof typeof fields, val: string) {
    setFields((f) => ({ ...f, [key]: val }));
  }

  function handleSave() {
    startSave(async () => {
      const fd = new FormData();
      fd.set("logDate", entry.logDate);
      if (fields.weightKg) fd.set("weightKg", fields.weightKg);
      if (fields.waistCm) fd.set("waistCm", fields.waistCm);
      if (fields.chestCm) fd.set("chestCm", fields.chestCm);
      if (fields.hipCm) fd.set("hipCm", fields.hipCm);
      const result = await upsertCheckInAction(null, fd);
      if (result.ok) {
        onSaved({
          logDate: entry.logDate,
          weightKg: fields.weightKg ? parseFloat(fields.weightKg) : null,
          waistCm: fields.waistCm ? parseFloat(fields.waistCm) : null,
          chestCm: fields.chestCm ? parseFloat(fields.chestCm) : null,
          hipCm: fields.hipCm ? parseFloat(fields.hipCm) : null,
        });
      }
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[var(--radius-lg)] border-t border-[var(--border)] bg-[var(--card)] p-4 pb-safe-or-8 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold">{formatWeekdayDate(entry.logDate)}</p>
          <button type="button" onClick={onClose} className="text-xs text-[var(--text3)]">
            Avbryt
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor={`es-w-${entry.logDate}`}>Vekt (kg)</Label>
            <Input
              id={`es-w-${entry.logDate}`}
              type="number" inputMode="decimal" step="0.1" placeholder="78.4"
              value={fields.weightKg}
              onChange={(e) => set("weightKg", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor={`es-m-${entry.logDate}`}>Midje</Label>
              <Input
                id={`es-m-${entry.logDate}`}
                type="number" inputMode="decimal" step="0.1" placeholder="94"
                value={fields.waistCm}
                onChange={(e) => set("waistCm", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={`es-b-${entry.logDate}`}>Bryst</Label>
              <Input
                id={`es-b-${entry.logDate}`}
                type="number" inputMode="decimal" step="0.1" placeholder="95"
                value={fields.chestCm}
                onChange={(e) => set("chestCm", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={`es-h-${entry.logDate}`}>Hofte</Label>
              <Input
                id={`es-h-${entry.logDate}`}
                type="number" inputMode="decimal" step="0.1" placeholder="96"
                value={fields.hipCm}
                onChange={(e) => set("hipCm", e.target.value)}
              />
            </div>
          </div>
        </div>
        <Button type="button" disabled={saving} onClick={handleSave} className="mt-4 w-full">
          {saving ? "Lagrer…" : "Lagre"}
        </Button>
      </div>
    </>
  );
}

export function CheckInHistory({
  initial,
  hasMore: initialHasMore,
}: {
  initial: CheckInSnapshot[];
  hasMore: boolean;
}) {
  const [entries, setEntries] = useState(initial);
  const [editingEntry, setEditingEntry] = useState<CheckInSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, startLoadMore] = useTransition();

  function loadMore() {
    startLoadMore(async () => {
      const next = await getCheckInHistoryPageAction(entries.length);
      setEntries((prev) => [...prev, ...next]);
      if (next.length < PAGE_SIZE) setHasMore(false);
    });
  }

  if (entries.length === 0) return null;

  return (
    <>
      <div className="mt-4">
        <h2 className="mb-2 text-sm font-semibold text-[var(--text2)]">Historikk</h2>
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
          {entries.map((entry, i) => (
            <SwipeRow
              key={entry.logDate}
              entry={entry}
              diff={computeDiff(entry, entries[i + 1] ?? null)}
              onEditOpen={() => setEditingEntry(entry)}
              onDeleted={() =>
                setEntries((prev) => prev.filter((e) => e.logDate !== entry.logDate))
              }
            />
          ))}
        </div>
        {hasMore && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="mt-2 w-full py-2.5 text-sm text-[var(--text2)] hover:text-[var(--text1)] disabled:opacity-50"
          >
            {loadingMore ? "Laster…" : "Vis 5 flere"}
          </button>
        )}
      </div>

      {editingEntry && (
        <EditSheet
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={(updated) => {
            setEntries((prev) =>
              prev.map((e) => (e.logDate === updated.logDate ? updated : e)),
            );
            setEditingEntry(null);
          }}
        />
      )}
    </>
  );
}
