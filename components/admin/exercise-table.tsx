"use client";

import { useState, useTransition, useCallback } from "react";
import Image from "next/image";
import { searchExercisesAdminAction, updateExerciseNamesAction } from "@/lib/actions/admin";
import { Input } from "@/components/ui/field";

type Row = {
  id: string;
  name: string;
  nameNo: string | null;
  slug: string;
  equipment: string;
  imageUrl: string | null;
};

function ExerciseRow({ row, onSaved }: { row: Row; onSaved: (r: Row) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.name);
  const [nameNo, setNameNo] = useState(row.nameNo ?? "");
  const [saving, startSave] = useTransition();

  function handleSave() {
    startSave(async () => {
      const res = await updateExerciseNamesAction(row.id, name, nameNo || null);
      if (res.ok) {
        onSaved({ ...row, name, nameNo: nameNo || null });
        setEditing(false);
      }
    });
  }

  function handleCancel() {
    setName(row.name);
    setNameNo(row.nameNo ?? "");
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); handleSave(); }
    if (e.key === "Escape") handleCancel();
  }

  if (editing) {
    return (
      <tr className="bg-[var(--card2)]">
        <td className="px-3 py-2">
          {row.imageUrl && (
            <Image src={row.imageUrl} alt={row.name} width={40} height={40} className="rounded object-cover" unoptimized />
          )}
        </td>
        <td className="px-3 py-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-xs"
            autoFocus
          />
        </td>
        <td className="px-3 py-2">
          <Input
            value={nameNo}
            onChange={(e) => setNameNo(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Norsk navn…"
            className="text-xs"
          />
        </td>
        <td className="px-3 py-2 text-xs text-[var(--text3)]">{row.equipment}</td>
        <td className="px-3 py-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="text-xs font-medium text-[var(--accent)] disabled:opacity-50"
            >
              {saving ? "Lagrer…" : "Lagre"}
            </button>
            <button type="button" onClick={handleCancel} className="text-xs text-[var(--text3)]">
              Avbryt
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-[var(--card-border)] hover:bg-[var(--card2)]">
      <td className="px-3 py-2">
        {row.imageUrl ? (
          <Image src={row.imageUrl} alt={row.name} width={40} height={40} className="rounded object-cover" unoptimized />
        ) : (
          <div className="h-10 w-10 rounded bg-[var(--card2)]" />
        )}
      </td>
      <td className="px-3 py-2 text-sm">{row.name}</td>
      <td className="px-3 py-2 text-sm text-[var(--text2)]">
        {row.nameNo ?? <span className="italic text-[var(--text3)]">–</span>}
      </td>
      <td className="px-3 py-2 text-xs text-[var(--text3)]">{row.equipment}</td>
      <td className="px-3 py-2">
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-[var(--accent)]">
          Rediger
        </button>
      </td>
    </tr>
  );
}

const PAGE = 50;

export function ExerciseTable({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(initial.length);
  const [hasMore, setHasMore] = useState(initial.length === PAGE);
  const [searching, startSearch] = useTransition();
  const [loadingMore, startLoadMore] = useTransition();

  const doSearch = useCallback((q: string) => {
    startSearch(async () => {
      const res = await searchExercisesAdminAction(q, 0, PAGE);
      setRows(res);
      setOffset(res.length);
      setHasMore(res.length === PAGE);
    });
  }, []);

  function handleQueryChange(q: string) {
    setQuery(q);
    doSearch(q);
  }

  function loadMore() {
    startLoadMore(async () => {
      const res = await searchExercisesAdminAction(query, offset, PAGE);
      setRows((prev) => [...prev, ...res]);
      setOffset((o) => o + res.length);
      setHasMore(res.length === PAGE);
    });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Søk navn (EN/NO)…"
          className="max-w-xs"
        />
        <span className={`text-xs text-[var(--text3)] ${searching ? "opacity-50" : ""}`}>
          {rows.length} øvelser
        </span>
        <div className="ml-auto flex gap-2">
          {(["csv", "json", "xlsx"] as const).map((fmt) => (
            <a
              key={fmt}
              href={`/api/admin/export/exercises?format=${fmt}`}
              download
              className="rounded border border-[var(--card-border)] px-2.5 py-1 text-xs font-medium text-[var(--text2)] hover:text-[var(--text1)] hover:border-[var(--accent)]"
            >
              {fmt.toUpperCase()}
            </a>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--card-border)]">
              <th className="px-3 py-2 w-14" />
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">Engelsk</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">Norsk</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">Utstyr</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <ExerciseRow
                key={row.id}
                row={row}
                onSaved={(updated) =>
                  setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
                }
              />
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-3 w-full py-2 text-sm text-[var(--text2)] disabled:opacity-50"
        >
          {loadingMore ? "Laster…" : "Last inn 50 til"}
        </button>
      )}
    </div>
  );
}
