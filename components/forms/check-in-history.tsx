"use client";

import { useState, useTransition } from "react";
import type { CheckInSnapshot } from "@/lib/queries/check-in";
import { upsertCheckInAction, getCheckInHistoryPageAction } from "@/lib/actions/check-in";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { formatWeekdayDate } from "@/lib/utils";

const PAGE_SIZE = 5;

function fmt(v: number | null, unit: string) {
  return v != null ? `${v} ${unit}` : null;
}

function RowDisplay({ entry, onEdit }: { entry: CheckInSnapshot; onEdit: () => void }) {
  const parts = [
    fmt(entry.weightKg, "kg"),
    fmt(entry.waistCm, "cm midje"),
    fmt(entry.chestCm, "cm bryst"),
    fmt(entry.hipCm, "cm hofte"),
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left active:bg-[var(--card2)]"
    >
      <span className="shrink-0 text-sm font-medium text-[var(--text1)]">
        {formatWeekdayDate(entry.logDate)}
      </span>
      <span className="text-right text-sm text-[var(--text2)]">
        {parts.length > 0 ? parts.join(" · ") : "—"}
      </span>
    </button>
  );
}

function RowEdit({
  entry,
  onCancel,
  onSaved,
}: {
  entry: CheckInSnapshot;
  onCancel: () => void;
  onSaved: (updated: CheckInSnapshot) => void;
}) {
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
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
      } else {
        setError(result.error ?? "Noe gikk galt.");
      }
    });
  }

  return (
    <div className="px-4 py-3 space-y-3">
      <p className="text-sm font-medium">{formatWeekdayDate(entry.logDate)}</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor={`w-${entry.logDate}`}>Vekt (kg)</Label>
          <Input
            id={`w-${entry.logDate}`}
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="78.4"
            value={fields.weightKg}
            onChange={(e) => set("weightKg", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`wst-${entry.logDate}`}>Midje (cm)</Label>
          <Input
            id={`wst-${entry.logDate}`}
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="94"
            value={fields.waistCm}
            onChange={(e) => set("waistCm", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`ch-${entry.logDate}`}>Bryst (cm)</Label>
          <Input
            id={`ch-${entry.logDate}`}
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="95"
            value={fields.chestCm}
            onChange={(e) => set("chestCm", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`hp-${entry.logDate}`}>Hofte (cm)</Label>
          <Input
            id={`hp-${entry.logDate}`}
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="96"
            value={fields.hipCm}
            onChange={(e) => set("hipCm", e.target.value)}
          />
        </div>
      </div>
      {error && <p className="text-xs text-[var(--red)]">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" disabled={saving} onClick={handleSave} className="flex-1">
          {saving ? "Lagrer…" : "Lagre"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Avbryt
        </Button>
      </div>
    </div>
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
  const [editingDate, setEditingDate] = useState<string | null>(null);
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
    <div className="mt-4">
      <h2 className="mb-2 text-sm font-semibold text-[var(--text2)]">Historikk</h2>
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
        {entries.map((entry) =>
          editingDate === entry.logDate ? (
            <RowEdit
              key={entry.logDate}
              entry={entry}
              onCancel={() => setEditingDate(null)}
              onSaved={(updated) => {
                setEntries((prev) =>
                  prev.map((e) => (e.logDate === updated.logDate ? updated : e)),
                );
                setEditingDate(null);
              }}
            />
          ) : (
            <RowDisplay
              key={entry.logDate}
              entry={entry}
              onEdit={() => setEditingDate(entry.logDate)}
            />
          ),
        )}
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
  );
}
