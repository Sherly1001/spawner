import type { ToastState } from "../hooks/useToasts";

interface Props {
  toasts: ToastState[];
  onDismiss: (id: number) => void;
}

export default function Toasts({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.kind}`}
          role="status"
          onClick={() => onDismiss(t.id)}
        >
          {t.kind === "loading" && <span className="toast-spinner" />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}
