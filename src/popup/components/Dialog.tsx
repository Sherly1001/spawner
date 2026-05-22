import { useEffect, useRef } from "react";

export type DialogTone = "default" | "danger";

export interface DialogProps {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default function Dialog({
  open,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  onCancel,
}: DialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel?.();
      } else if (e.key === "Enter") {
        e.preventDefault();
        onConfirm?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div
      className="dlg-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div
        className="dlg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dlg-title"
      >
        {title && (
          <h2 id="dlg-title" className="dlg-title">
            {title}
          </h2>
        )}
        {message && <p className="dlg-msg">{message}</p>}
        <div className="dlg-actions">
          {onCancel && <button onClick={onCancel}>{cancelLabel}</button>}
          <button
            ref={confirmRef}
            className={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
