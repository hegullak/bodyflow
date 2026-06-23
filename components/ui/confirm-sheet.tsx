"use client";

interface ConfirmSheetProps {
  open: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({
  open,
  message,
  confirmLabel = "Ja, slett",
  cancelLabel = "Avbryt",
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-end bg-black/40"
      onPointerDown={onCancel}
    >
      <div
        className="w-full rounded-t-2xl bg-[var(--card)] px-4 pb-10 pt-4"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mb-1 mx-auto h-1 w-10 rounded-full bg-[var(--border)]" />
        <p className="my-5 text-center text-sm text-[var(--text1)]">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl py-3 bg-[var(--card2)] text-sm font-medium text-[var(--text2)] active:opacity-70"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl py-3 bg-[var(--red)] text-sm font-semibold text-white active:opacity-70"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
