import { getDomain } from "tldts";
import browser, { type Runtime } from "webextension-polyfill";
import type { CookieDetail } from "./cookie-jar";
import {
  applyTabIcon,
  refreshIconsAllTabs,
  refreshIconsForSession,
} from "./icons";
import type { SessionStore } from "./sessions";
import type { Session, SessionSummary, Settings, SessionType } from "./types";

export type Message =
  | { type: "listSessions" }
  | { type: "createSession"; payload?: Parameters<SessionStore["create"]>[0] }
  | { type: "deleteSession"; payload: { id: string } }
  | { type: "renameSession"; payload: { id: string; name: string } }
  | { type: "setSessionColor"; payload: { id: string; color: string } }
  | { type: "setSessionType"; payload: { id: string; type: SessionType } }
  | { type: "clearSessionCookies"; payload: { id: string } }
  | {
      type: "flushNativeToSession";
      payload: { sessionId: string; url: string };
    }
  | { type: "flushSessionToNative"; payload: { sessionId: string } }
  | {
      type: "openInSession";
      payload: { sessionId: string; url?: string };
    }
  | { type: "assignCurrentTab"; payload: { sessionId: string } }
  | { type: "unassignTab"; payload?: { tabId?: number } }
  | { type: "currentTabSession" }
  | { type: "isVirtualSession" }
  | { type: "getSettings" }
  | { type: "setSettings"; payload?: Partial<Settings> }
  | { type: "setCookieFromPage"; payload: { cookie: string; url: string } }
  | { type: "getCookieForPage"; payload: { url: string } };

type Handler = (
  store: SessionStore,
  msg: Message,
  sender: Runtime.MessageSender,
) => unknown | Promise<unknown>;

async function getActiveTab(): Promise<browser.Tabs.Tab | null> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  return tab ?? null;
}

function summarize(session: Session): SessionSummary {
  return {
    id: session.id,
    name: session.name,
    type: session.type,
    color: session.color,
    cookieCount: session.jar.cookieCount(),
    domains: session.jar.cookieDomains(),
  };
}

function nativeToDetail(c: browser.Cookies.Cookie): CookieDetail {
  const ss = c.sameSite;
  return {
    name: c.name,
    value: c.value,
    domain: c.domain.replace(/^\./, ""),
    path: c.path,
    secure: c.secure,
    httpOnly: c.httpOnly,
    sameSite:
      ss === "strict"
        ? "strict"
        : ss === "lax"
          ? "lax"
          : ss === "no_restriction"
            ? "none"
            : undefined,
    hostOnly: c.hostOnly,
    expires: c.session ? undefined : c.expirationDate,
  };
}

function toughToNativeSameSite(
  s: CookieDetail["sameSite"],
): browser.Cookies.SameSiteStatus | undefined {
  if (s === "none") return "no_restriction";
  if (s === "lax") return "lax";
  if (s === "strict") return "strict";
  return undefined;
}

const handlers: Record<string, Handler> = {
  listSessions: (store) => store.list(),

  createSession: (store, msg) => {
    if (msg.type !== "createSession") return;
    const session = store.create(msg.payload ?? {});
    return summarize(session);
  },

  deleteSession: async (store, msg) => {
    if (msg.type !== "deleteSession") return;
    const id = msg.payload.id;
    const orphanTabs: number[] = [];
    for (const [tabId, sid] of store.tabToSession) {
      if (sid === id) orphanTabs.push(tabId);
    }
    store.remove(id);
    if (orphanTabs.length > 0) {
      try {
        await browser.tabs.remove(orphanTabs);
      } catch {
        // tab(s) already closed
      }
    }
    return { ok: true };
  },

  renameSession: (store, msg) => {
    if (msg.type !== "renameSession") return;
    const ok = store.rename(msg.payload.id, msg.payload.name);
    if (ok) {
      broadcastSettings(store);
      refreshIconsForSession(store, msg.payload.id);
    }
    return { ok };
  },

  setSessionColor: (store, msg) => {
    if (msg.type !== "setSessionColor") return;
    const ok = store.setColor(msg.payload.id, msg.payload.color);
    if (ok) {
      broadcastSettings(store);
      refreshIconsForSession(store, msg.payload.id);
    }
    return { ok };
  },

  setSessionType: (store, msg) => {
    if (msg.type !== "setSessionType") return;
    const ok = store.setType(msg.payload.id, msg.payload.type);
    return { ok };
  },

  clearSessionCookies: (store, msg) => {
    if (msg.type !== "clearSessionCookies") return;
    store.clearCookies(msg.payload.id);
    return { ok: true };
  },

  flushNativeToSession: async (store, msg) => {
    if (msg.type !== "flushNativeToSession") return;
    const { sessionId, url } = msg.payload;
    const session = store.sessions.get(sessionId);
    if (!session) return { ok: false, error: "unknown session" };
    // Registrable domain (covers subdomains); fall back to bare hostname for
    // localhost / IPs / intranet hosts that have no public suffix.
    let domain = getDomain(url);
    if (!domain) {
      try {
        domain = new URL(url).hostname;
      } catch {
        domain = "";
      }
    }
    if (!domain) return { ok: false, error: "no domain" };
    const cookies = await browser.cookies.getAll({ domain });
    let count = 0;
    for (const c of cookies) {
      session.jar.setFromCookie(nativeToDetail(c));
      count++;
    }
    if (session.type === "stored") store.persistStored();
    return { ok: true, count };
  },

  flushSessionToNative: async (store, msg) => {
    if (msg.type !== "flushSessionToNative") return;
    const session = store.sessions.get(msg.payload.sessionId);
    if (!session) return { ok: false, error: "unknown session" };
    let count = 0;
    for (const d of session.jar.exportCookies()) {
      const scheme = d.secure ? "https" : "http";
      const url = `${scheme}://${d.domain}${d.path || "/"}`;
      try {
        await browser.cookies.set({
          url,
          name: d.name,
          value: d.value,
          domain: d.hostOnly ? undefined : d.domain,
          path: d.path,
          secure: d.secure,
          httpOnly: d.httpOnly,
          sameSite: toughToNativeSameSite(d.sameSite),
          expirationDate: d.expires,
        });
        count++;
      } catch {
        // skip cookies the browser rejects (e.g. __Host- prefix violations)
      }
    }
    return { ok: true, count };
  },

  openInSession: async (store, msg) => {
    if (msg.type !== "openInSession") return;
    const { sessionId, url } = msg.payload;
    if (!store.sessions.has(sessionId)) {
      return { ok: false, error: "unknown session" };
    }
    // Create the tab on about:blank first, assign the session, then navigate —
    // otherwise the first request fires before assignment and bypasses the jar.
    const tab = await browser.tabs.create({ url: "about:blank", active: true });
    if (tab.id == null) return { ok: false, error: "no tab id" };
    store.assignTab(tab.id, sessionId);
    applyTabIcon(store, tab.id);
    if (url && url !== "about:blank") {
      await browser.tabs.update(tab.id, { url });
    }
    return { ok: true, tabId: tab.id };
  },

  assignCurrentTab: async (store, msg) => {
    if (msg.type !== "assignCurrentTab") return;
    const tab = await getActiveTab();
    if (!tab?.id) return { ok: false };
    const ok = store.assignTab(tab.id, msg.payload.sessionId);
    if (ok) {
      applyTabIcon(store, tab.id);
      await browser.tabs.reload(tab.id);
    }
    return { ok, tabId: tab.id };
  },

  unassignTab: async (store, msg) => {
    if (msg.type !== "unassignTab") return;
    const explicit = msg.payload?.tabId;
    if (explicit != null) {
      store.unassignTab(explicit);
      applyTabIcon(store, explicit);
      return { ok: true };
    }
    const tab = await getActiveTab();
    if (tab?.id != null) {
      store.unassignTab(tab.id);
      applyTabIcon(store, tab.id);
      await browser.tabs.reload(tab.id);
    }
    return { ok: true };
  },

  currentTabSession: async (store) => {
    const tab = await getActiveTab();
    if (!tab?.id) return null;
    const session = store.sessionForTab(tab.id);
    return session ? summarize(session) : null;
  },

  isVirtualSession: (store, _msg, sender) => {
    const tab = sender.tab;
    if (!tab?.id) return { virtual: false };
    const session = store.sessionForTab(tab.id);
    if (!session) return { virtual: false };
    const url = sender.url ?? tab.url ?? "";
    return {
      virtual: true,
      init: session.jar.documentString(url),
      sessionId: session.id,
      sessionName: session.name,
      sessionColor: session.color,
      prefixTabName: !!store.settings.prefixTabName,
    };
  },

  getSettings: (store) => store.settings,

  setSettings: (store, msg) => {
    if (msg.type !== "setSettings") return;
    const next = store.updateSettings(msg.payload ?? {});
    broadcastSettings(store);
    refreshIconsAllTabs(store);
    return next;
  },

  setCookieFromPage: (store, msg, sender) => {
    if (msg.type !== "setCookieFromPage") return;
    const tabId = sender.tab?.id;
    if (tabId == null) return { ok: false };
    const session = store.sessionForTab(tabId);
    if (!session) return { ok: true };
    session.jar.setFromDocument(msg.payload.cookie, msg.payload.url);
    if (session.type === "stored") store.persistStored();
    return { ok: true };
  },

  getCookieForPage: (store, msg, sender) => {
    if (msg.type !== "getCookieForPage") return;
    const tabId = sender.tab?.id;
    if (tabId == null) return { cookie: "" };
    const session = store.sessionForTab(tabId);
    return {
      cookie: session ? session.jar.documentString(msg.payload.url) : "",
    };
  },
};

function broadcastSettings(store: SessionStore): void {
  for (const [tabId, sessionId] of store.tabToSession) {
    const session = store.sessions.get(sessionId);
    if (!session) continue;
    browser.tabs
      .sendMessage(tabId, {
        type: "settingsUpdated",
        payload: {
          prefixTabName: !!store.settings.prefixTabName,
          sessionName: session.name,
          sessionColor: session.color,
        },
      })
      .catch(() => {
        // tab may not have a content script (chrome:// pages, etc.)
      });
  }
}

function setupTabLifecycle(store: SessionStore): void {
  // New tabs (e.g. target=_blank) inherit the opener's session so navigation
  // stays inside the session.
  browser.tabs.onCreated.addListener((tab) => {
    if (tab.openerTabId != null) {
      const opener = store.sessionForTab(tab.openerTabId);
      if (opener && tab.id != null) store.assignTab(tab.id, opener.id);
    }
    if (tab.id != null) applyTabIcon(store, tab.id);
  });

  // Some sites reset the action icon on navigation — repaint every load.
  browser.tabs.onUpdated.addListener((tabId, info) => {
    if (info.status === "loading") applyTabIcon(store, tabId);
  });

  // Temp sessions disappear when their last tab closes.
  browser.tabs.onRemoved.addListener((tabId) => {
    const sid = store.tabToSession.get(tabId);
    store.unassignTab(tabId);
    if (!sid) return;
    const session = store.sessions.get(sid);
    if (!session || session.type !== "temp") return;

    let stillUsed = false;
    for (const otherSid of store.tabToSession.values()) {
      if (otherSid === sid) {
        stillUsed = true;
        break;
      }
    }
    if (!stillUsed) store.remove(sid);
  });
}

export function setupMessaging(store: SessionStore): void {
  browser.runtime.onMessage.addListener(
    (rawMsg: unknown, sender: Runtime.MessageSender) => {
      const msg = rawMsg as Message | undefined;
      if (!msg?.type) return false;
      const handler = handlers[msg.type];
      if (!handler) return false;
      return Promise.resolve(handler(store, msg, sender));
    },
  );

  setupTabLifecycle(store);
  refreshIconsAllTabs(store);
}
