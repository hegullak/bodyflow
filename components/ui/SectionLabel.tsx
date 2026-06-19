import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function SectionLabel({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-3xs uppercase tracking-[1.92px] text-[var(--text3)] font-semibold mt-5 mb-2",
        className,
      )}
      {...props}
    />
  );
}

export function DayLabel({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-3xs uppercase tracking-[1.2px] text-[var(--sage)] font-semibold",
        className,
      )}
      {...props}
    />
  );
}
