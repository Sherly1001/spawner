export const COLORS = [
  "#ff757f",
  "#ffc777",
  "#c3e88d",
  "#86e1fc",
  "#82aaff",
  "#c099ff",
  "#c53b53",
  "#3e68d7",
];

export const pickColor = () =>
  COLORS[Math.floor(Math.random() * COLORS.length)];

export const isHttp = (u?: string) => /^https?:\/\//i.test(u || "");

export function normalizeUrl(input: string | undefined, fallback?: string) {
  const value = (input || "").trim();
  if (!value) return fallback || "about:blank";
  if (/^(https?|file|about):/i.test(value)) return value;
  return "https://" + value;
}
