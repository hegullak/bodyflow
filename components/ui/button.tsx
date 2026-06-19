import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-semibold transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 disabled:pointer-events-none disabled:opacity-50 active:opacity-85",
  {
    variants: {
      variant: {
        default:   "bg-[var(--accent)] text-[var(--card)] text-sm",
        secondary: "bg-[var(--card)] border border-[var(--border)] text-[var(--text1)] text-sm",
        ghost:     "bg-transparent text-[var(--accent)] text-sm",
        outline:   "border border-[var(--border)] bg-[var(--card)] text-[var(--text1)] hover:bg-[var(--card2)] text-sm",
      },
      size: {
        default: "rounded-lg py-3 px-4",
        sm:      "rounded-md py-2 px-3 text-xs",
        cta:     "min-h-[56px] rounded-2xl px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
