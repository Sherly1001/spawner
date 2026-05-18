import browser, { type Runtime } from "webextension-polyfill";
import {
  applyTabIcon,
  refreshIconsAllTabs,
  refreshIconsForSession,
} from "./icons";
import type { SessionStore } from "./sessions";
import type { Session, SessionSummary, Settings } from "./types";

export type Message =
  | { type: "listSessions" }
  | { type: "createSession"; payload?: Parameters<SessionStore["create"]>[0] }
  | { type: "deleteSession"; payload: { id: string } }
  | { type: "renameSession"; payload: { id: string; name: string } }
  | { type: "setSessionColor"; payload: { id: string; color: string } }
  | { type: "clearSessionCookies"; payload: { id: string } }
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
  };
}

const handlers: Record<string, Handler> = {
  listSessions: (store) => store.list(),

  createSession: (store, msg) => {
    if (msg.type !== "createSession") return;
    const session = store.create(msg.payload ?? {});
    return summarize(session);
  },

  deleteSession: (store, msg) => {
    if (msg.type !== "deleteSession") return;
    const id = msg.payload.id;
    const orphanTabs: number[] = [];
    for (const [tabId, sid] of store.tabToSession) {
      if (sid === id) orphanTabs.push(tabId);
    }
    store.remove(id);
    for (const tabId of orphanTabs) applyTabIcon(store, tabId);
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

  clearSessionCookies: (store, msg) => {
    if (msg.type !== "clearSessionCookies") return;
    store.clearCookies(msg.payload.id);
    return { ok: true };
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
