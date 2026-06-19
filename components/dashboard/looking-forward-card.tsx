"use client";

import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { updateLookingForwardToAction } from "@/lib/actions/dashboard";
import { useT } from "@/components/providers/lang-provider";

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
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>{d.lookingForwardTo}</CardTitle>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            aria-label={t.common.edit}
            className="text-[var(--text2)] hover:text-[var(--text1)]"
          >
            <Pencil className="h-4 w-4" />
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
            className="w-full resize-none rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
          <div className="mt-2 flex gap-3">
            <button type="button" onClick={save} className="text-sm font-medium text-[var(--color-primary)]">
              {t.common.save}
            </button>
            <button type="button" onClick={cancel} className="text-sm text-[var(--text2)]">
              {t.common.cancel}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={startEdit} className="mt-2 w-full text-left">
          {value ? (
            <p className="text-sm leading-relaxed">{value}</p>
          ) : (
            <p className="text-sm italic text-[var(--text2)]">{d.nothingYet}</p>
          )}
        </button>
      )}
    </Card>
  );
}
