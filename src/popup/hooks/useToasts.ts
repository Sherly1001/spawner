import { useCallback, useEffect, useRef, useState } from "react";

export interface ToastState {
  id: number;
  msg: string;
  kind: "loading" | "success" | "error";
}

export interface ToastApi {
  toasts: ToastState[];
  addToast: (msg: string, kind: ToastState["kind"]) => number;
  updateToast: (id: number, msg: string, kind: ToastState["kind"]) => void;
  dismissToast: (id: number) => void;
}

export function useToasts(): ToastApi {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const toastSeq = useRef(0);
  const toastTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismissToast = useCallback((id: number) => {
    const t = toastTimers.current.get(id);
    if (t) {
      clearTimeout(t);
      toastTimers.current.delete(id);
    }
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const scheduleDismiss = useCallback(
    (id: number, kind: ToastState["kind"]) => {
      if (kind === "loading") return;
      toastTimers.current.set(
        id,
        setTimeout(() => dismissToast(id), kind === "error" ? 3000 : 2000),
      );
    },
    [dismissToast],
  );

  const addToast = useCallback(
    (msg: string, kind: ToastState["kind"]): number => {
      const id = ++toastSeq.current;
      setToasts((prev) => [{ id, msg, kind }, ...prev]);
      scheduleDismiss(id, kind);
      return id;
    },
    [scheduleDismiss],
  );

  const updateToast = useCallback(
    (id: number, msg: string, kind: ToastState["kind"]) => {
      setToasts((prev) =>
        prev.map((x) => (x.id === id ? { ...x, msg, kind } : x)),
      );
      scheduleDismiss(id, kind);
    },
    [scheduleDismiss],
  );

  useEffect(() => {
    const timers = toastTimers.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  return { toasts, addToast, updateToast, dismissToast };
}
