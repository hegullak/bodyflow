import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-[var(--color-foreground)]", className)}
      {...props}
    />
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card2)] px-3 text-sm text-[var(--text1)] placeholder:text-[var(--text3)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20",
          className,
        )}
        {...props}
      />
    );
  },
);

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-10 w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card2)] px-3 text-sm text-[var(--text1)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card2)] px-3 py-2 text-sm text-[var(--text1)] placeholder:text-[var(--text3)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20",
        className,
      )}
      {...props}
    />
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-[#9a5b45]">{message}</p>;
}
