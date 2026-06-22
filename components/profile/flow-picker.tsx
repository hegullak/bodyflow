"use client";

import { useTransition } from "react";
import { updateDefaultFlowAction, type DefaultFlow } from "@/lib/actions/profile";
import { cn } from "@/lib/utils";

const FLOWS: { value: DefaultFlow; label: string; bg: string; accent: string }[] = [
  // Dashboard hidden for now — will redesign and enable later
  // { value: "dashboard",  label: "Dashboard",  bg: "#1A1E26", accent: "#7EB8D4" },
  { value: "training",   label: "Trening",    bg: "#0D0906", accent: "#BE5228" },
  { value: "meals",      label: "Næring",     bg: "#0E0C0A", accent: "#F59E0B" },
  { value: "check-in",   label: "Mål",        bg: "#09100A", accent: "#5AA86A" },
];

export function FlowPicker({ current }: { current: DefaultFlow }) {
  const [pending, startTransition] = useTransition();

  function handleSelect(flow: DefaultFlow) {
    startTransition(async () => {
      await updateDefaultFlowAction(flow);
    });
  }

  return (
    <div className={cn("flex gap-4", pending && "opacity-60 pointer-events-none")}>
      {FLOWS.map((f) => {
        const active = f.value === current;
        return (
          <button
            key={f.value}
            type="button"
            onClick={() => handleSelect(f.value)}
            className="flex flex-col items-center gap-1.5"
            title={f.label}
          >
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                active ? "scale-110" : "opacity-70 hover:opacity-100",
              )}
              style={{
                backgroundColor: f.bg,
                borderColor: active ? f.accent : "transparent",
                boxShadow: active ? `0 0 0 2px ${f.accent}40` : "none",
              }}
            >
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: f.accent }} />
            </span>
            <span
              className="text-[11px] font-medium"
              style={{ color: active ? "var(--text1)" : "var(--text3)" }}
            >
              {f.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
