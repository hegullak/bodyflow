"use client";

import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { updateLookingForwardToAction } from "@/lib/actions/dashboard";
import { useT } from "@/components/providers/lang-provider";
import { cn } from "@/lib/utils";

export function LookingForwardCard({ initialValue }: { initialValue: string | null }) {
  const t = useT();
  const d = t.dashboard;
  const [value, setValue] = useState(initialValue ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialValue ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function startEdit() {
    setDraft(value);
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  async function save() {
    setValue(draft.trim());
    setEditing(false);
    await updateLookingForwardToAction(draft);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-[var(--card-border)] px-4 py-4",
        "bg-[var(--amber-light)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--text3)]">
          {d.lookingForwardTo}
        </p>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            aria-label={t.common.edit}
            className="shrink-0 text-[var(--text3)] transition-colors hover:text-[var(--text2)]"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder={d.placeholder}
            className="w-full resize-none rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm focus:outline-none"
          />
          <div className="mt-2 flex gap-3">
            <button type="button" onClick={save} className="text-sm font-medium text-[var(--accent)]">
              {t.common.save}
            </button>
            <button type="button" onClick={cancel} className="text-sm text-[var(--text3)]">
              {t.common.cancel}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="mt-2 w-full text-left"
        >
          {value ? (
            <p className="text-base font-medium leading-snug text-[var(--text1)]">{value}</p>
          ) : (
            <p className="text-sm italic text-[var(--text3)]">{d.nothingYet}</p>
          )}
        </button>
      )}
    </div>
  );
}
