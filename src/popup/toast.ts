import { notifications } from "@mantine/notifications";

export type ToastKind = "loading" | "success" | "error";

let seq = 0;

function opts(kind: ToastKind) {
  return {
    loading: kind === "loading",
    color: kind === "error" ? "red" : kind === "success" ? "green" : "blue",
    autoClose:
      kind === "loading" ? (false as const) : kind === "error" ? 3000 : 2000,
    withCloseButton: kind !== "loading",
  };
}

export function addToast(msg: string, kind: ToastKind): string {
  const id = `toast-${++seq}`;
  notifications.show({ id, message: msg, ...opts(kind) });
  return id;
}

export function updateToast(id: string, msg: string, kind: ToastKind): void {
  notifications.update({ id, message: msg, ...opts(kind) });
}

export function dismissToast(id: string): void {
  notifications.hide(id);
}
