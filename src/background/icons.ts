import type { SessionStore } from "./sessions";

const ICON_SIZES = [19, 38] as const;
const DEFAULT_GRAY = "#9ca3af";
const DEFAULT_BLUE = "#2563eb";

type IconSet = Record<number, ImageData>;
const iconCache = new Map<string, IconSet>();

function roundedRectPath(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function createCanvasContext(size: number): {
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
} | null {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d");
    return ctx ? { ctx } : null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  return ctx ? { ctx } : null;
}

function renderIcon(color: string, size: number): ImageData | null {
  const created = createCanvasContext(size);
  if (!created) return null;
  const { ctx } = created;

  ctx.clearRect(0, 0, size, size);
  const pad = Math.max(1, Math.round(size / 16));
  const radius = Math.max(2, Math.round(size / 6));
  roundedRectPath(ctx, pad, pad, size - pad * 2, size - pad * 2, radius);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.round(size * 0.62)}px -apple-system, "Segoe UI", Arial, sans-serif`;
  ctx.fillText("[S]", size / 2, size / 2 + Math.round(size / 32));

  return ctx.getImageData(0, 0, size, size);
}

function iconSetFor(color: string): IconSet {
  const cached = iconCache.get(color);
  if (cached) return cached;
  const set: IconSet = {};
  for (const size of ICON_SIZES) {
    const image = renderIcon(color, size);
    if (image) set[size] = image;
  }
  iconCache.set(color, set);
  return set;
}

function pickIconColor(store: SessionStore, tabId: number): string {
  if (!store.settings.colorizeIcon) return DEFAULT_BLUE;
  const session = store.sessionForTab(tabId);
  if (session) return session.color;
  return DEFAULT_GRAY;
}

export function applyTabIcon(store: SessionStore, tabId: number): void {
  if (tabId == null || tabId < 0) return;
  const session = store.sessionForTab(tabId);
  const color = pickIconColor(store, tabId);
  const title = session ? `Spawner — ${session.name}` : "Spawner";

  try {
    chrome.browserAction.setIcon(
      { tabId, imageData: iconSetFor(color) },
      () => void chrome.runtime.lastError,
    );
    chrome.browserAction.setTitle({ tabId, title });
  } catch {
    // browserAction may be unavailable on some pages
  }
}

export function refreshIconsForSession(
  store: SessionStore,
  sessionId: string,
): void {
  for (const [tabId, sid] of store.tabToSession) {
    if (sid === sessionId) applyTabIcon(store, tabId);
  }
}

export function refreshIconsAllTabs(store: SessionStore): void {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id != null) applyTabIcon(store, tab.id);
    }
  });
}
