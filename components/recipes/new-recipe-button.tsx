"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NewRecipeButton() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        const recipe = await res.json();
        router.push(`/meals/recipes/${recipe.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  if (showForm) {
    return (
      <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] p-4">
        <input
          autoFocus
          placeholder="Oppskriftsnavn, f.eks. Lapskaus"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text1)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
        />
        <div className="flex gap-2">
          <Button onClick={handleCreate} disabled={creating || !name.trim()} className="flex-1">
            {creating ? "Oppretter…" : "Opprett"}
          </Button>
          <Button variant="outline" onClick={() => { setShowForm(false); setName(""); }}>
            Avbryt
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowForm(true)}
      className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] py-4 text-[var(--text2)] active:bg-[var(--card)]"
    >
      <Plus className="h-5 w-5" />
      Ny oppskrift
    </button>
  );
}
