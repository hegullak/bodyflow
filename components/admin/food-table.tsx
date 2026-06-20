"use client";

import { useState, useTransition, useCallback } from "react";
import { searchFoodsAdminAction, updateFoodPrettyNameAction } from "@/lib/actions/admin";
import { Input } from "@/components/ui/field";

type Row = {
  id: string;
  name: string;
  prettyName: string | null;
  brand: string | null;
  source: string;
  kcalPer100g: number;
};

type Source = "all" | "kassal" | "matvaretabellen" | "custom";

function FoodRow({ row, onSaved }: { row: Row; onSaved: (r: Row) => void }) {
  const [editing, setEditing] = useState(false);
  const [prettyName, setPrettyName] = useState(row.prettyName ?? "");
  const [saving, startSave] = useTransition();

  function handleSave() {
    startSave(async () => {
      const res = await updateFoodPrettyNameAction(row.id, prettyName || null);
      if (res.ok) {
        onSaved({ ...row, prettyName: prettyName || null });
        setEditing(false);
      }
    });
  }

  if (editing) {
    return (
      <tr className="bg-[var(--card2)]">
        <td className="px-3 py-2 text-xs text-[var(--text3)]">{row.source}</td>
        <td className="px-3 py-2 text-sm">{row.name}</td>
        <td className="px-3 py-2">
          <Input
            value={prettyName}
            onChange={(e) => setPrettyName(e.target.value)}
            placeholder="Pent navn…"
            className="text-xs"
            autoFocus
          />
        </td>
        <td className="px-3 py-2 text-xs text-[var(--text3)]">{row.brand ?? "—"}</td>
        <td className="px-3 py-2 text-xs text-[var(--text3)]">{row.kcalPer100g}</td>
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
            <button type="button" onClick={() => { setPrettyName(row.prettyName ?? ""); setEditing(false); }} className="text-xs text-[var(--text3)]">
              Avbryt
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-[var(--card-border)] hover:bg-[var(--card2)]">
      <td className="px-3 py-2 text-xs text-[var(--text3)]">{row.source}</td>
      <td className="px-3 py-2 text-sm">{row.name}</td>
      <td className="px-3 py-2 text-sm text-[var(--text2)]">
        {row.prettyName ?? <span className="italic text-[var(--text3)]">–</span>}
      </td>
      <td className="px-3 py-2 text-xs text-[var(--text3)]">{row.brand ?? "—"}</td>
      <td className="px-3 py-2 text-xs text-[var(--text3)]">{row.kcalPer100g}</td>
      <td className="px-3 py-2">
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-[var(--accent)]">
          Rediger
        </button>
      </td>
    </tr>
  );
}

const PAGE = 50;

export function FoodTable({ initial, initialSource }: { initial: Row[]; initialSource: Source }) {
  const [rows, setRows] = useState(initial);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<Source>(initialSource);
  const [offset, setOffset] = useState(initial.length);
  const [hasMore, setHasMore] = useState(initial.length === PAGE);
  const [searching, startSearch] = useTransition();
  const [loadingMore, startLoadMore] = useTransition();

  const doSearch = useCallback((q: string, src: Source) => {
    startSearch(async () => {
      const res = await searchFoodsAdminAction(q, src, 0, PAGE);
      setRows(res);
      setOffset(res.length);
      setHasMore(res.length === PAGE);
    });
  }, []);

  function handleQueryChange(q: string) {
    setQuery(q);
    doSearch(q, source);
  }

  function handleSourceChange(src: Source) {
    setSource(src);
    doSearch(query, src);
  }

  function loadMore() {
    startLoadMore(async () => {
      const res = await searchFoodsAdminAction(query, source, offset, PAGE);
      setRows((prev) => [...prev, ...res]);
      setOffset((o) => o + res.length);
      setHasMore(res.length === PAGE);
    });
  }

  const sources: { id: Source; label: string }[] = [
    { id: "all", label: "Alle" },
    { id: "kassal", label: "Kassal" },
    { id: "matvaretabellen", label: "Matvaretabellen" },
    { id: "custom", label: "Egne" },
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Søk navn / merke…"
          className="max-w-xs"
        />
        {/* Source filter */}
        <div className="flex rounded-lg border border-[var(--card-border)] overflow-hidden">
          {sources.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSourceChange(s.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                source === s.id
                  ? "bg-[var(--accent)] text-[var(--card)]"
                  : "text-[var(--text2)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span className={`text-xs text-[var(--text3)] ${searching ? "opacity-50" : ""}`}>
          {rows.length} varer
        </span>
        <div className="ml-auto flex gap-2">
          {(["csv", "json", "xlsx"] as const).map((fmt) => (
            <a
              key={fmt}
              href={`/api/admin/export/foods?format=${fmt}&source=${source}`}
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
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">Kilde</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">Navn</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">Pent navn</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">Merke</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">kcal/100g</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <FoodRow
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
