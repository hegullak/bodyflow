import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type StripeColor = "blue" | "amber" | "gold" | "green" | "dusk" | "sage" | "accent";

const stripeVar: Record<StripeColor, string> = {
  blue:   "var(--blue)",
  amber:  "var(--amber)",
  gold:   "var(--gold)",
  green:  "var(--green)",
  dusk:   "var(--dusk)",
  sage:   "var(--sage)",
  accent: "var(--accent)",
};

interface BriefCardProps extends HTMLAttributes<HTMLDivElement> {
  stripe?: StripeColor;
}

export function BriefCard({ stripe, className, children, ...props }: BriefCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3",
        stripe && "pl-5",
        className,
      )}
      {...props}
    >
      {stripe && (
        <span
          aria-hidden
          style={{ backgroundColor: stripeVar[stripe] }}
          className="absolute inset-y-0 left-0 w-[3px]"
        />
      )}
      {children}
    </div>
  );
}
