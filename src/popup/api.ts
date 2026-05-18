import browser from "webextension-polyfill";

export interface SessionSummary {
  id: string;
  name: string;
  type: "temp" | "stored";
  color: string;
  cookieCount: number;
}

export interface Settings {
  prefixTabName: boolean;
  colorizeIcon: boolean;
}

export interface CreateSessionInput {
  name: string;
  type: "temp" | "stored";
  color: string;
}

function send<T>(type: string, payload?: unknown): Promise<T> {
  return browser.runtime.sendMessage({ type, payload }) as Promise<T>;
}

export const listSessions = () => send<SessionSummary[]>("listSessions");
export const createSession = (input: CreateSessionInput) =>
  send<SessionSummary>("createSession", input);
export const deleteSession = (id: string) =>
  send<{ ok: boolean }>("deleteSession", { id });
export const renameSession = (id: string, name: string) =>
  send<{ ok: boolean }>("renameSession", { id, name });
export const setSessionColor = (id: string, color: string) =>
  send<{ ok: boolean }>("setSessionColor", { id, color });
export const clearSessionCookies = (id: string) =>
  send<{ ok: boolean }>("clearSessionCookies", { id });
export const openInSession = (sessionId: string, url: string) =>
  send<{ ok: boolean; tabId?: number }>("openInSession", { sessionId, url });
export const assignCurrentTab = (sessionId: string) =>
  send<{ ok: boolean; tabId?: number }>("assignCurrentTab", { sessionId });
export const unassignCurrentTab = () =>
  send<{ ok: boolean }>("unassignTab", {});
export const currentTabSession = () =>
  send<SessionSummary | null>("currentTabSession");
export const getSettings = () => send<Settings>("getSettings");
export const setSettings = (patch: Partial<Settings>) =>
  send<Settings>("setSettings", patch);

export async function getActiveTab(): Promise<browser.Tabs.Tab | null> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  return tab ?? null;
}
