import browser from "webextension-polyfill";
import { SessionJar } from "./cookie-jar";
import type {
  CreateSessionOptions,
  Session,
  SessionSummary,
  Settings,
} from "./types";

const STORAGE_KEY = "spawner.storedSessions";
const SETTINGS_KEY = "spawner.settings";
const PERSIST_DEBOUNCE_MS = 400;

const DEFAULT_SETTINGS: Settings = {
  prefixTabName: true,
  colorizeIcon: true,
};

interface PersistedSession {
  name: string;
  color: string;
  cookies: unknown;
}

type PersistedSessionMap = Record<string, PersistedSession>;

function makeSessionId(): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `s_${time}_${rand}`;
}

/**
 * Session store. Holds two kinds of sessions:
 *   - 'temp'   : in-memory only, gone on browser restart
 *   - 'stored' : persisted to browser.storage.local
 */
export class SessionStore {
  readonly sessions = new Map<string, Session>();
  readonly tabToSession = new Map<number, string>();
  settings: Settings = { ...DEFAULT_SETTINGS };

  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  async load(): Promise<void> {
    const result = await browser.storage.local.get([STORAGE_KEY, SETTINGS_KEY]);

    const stored = (result[STORAGE_KEY] as PersistedSessionMap) ?? {};
    for (const [id, record] of Object.entries(stored)) {
      this.sessions.set(id, {
        id,
        name: record.name,
        type: "stored",
        color: record.color,
        jar: new SessionJar(record.cookies as never),
      });
    }

    const saved = (result[SETTINGS_KEY] as Partial<Settings>) ?? {};
    this.settings = { ...DEFAULT_SETTINGS, ...saved };
  }

  updateSettings(patch: Partial<Settings>): Settings {
    this.settings = { ...this.settings, ...patch };
    void browser.storage.local.set({ [SETTINGS_KEY]: this.settings });
    return this.settings;
  }

  create(opts: CreateSessionOptions = {}): Session {
    const type = opts.type === "temp" ? "temp" : "stored";
    const session: Session = {
      id: makeSessionId(),
      name: opts.name || (type === "temp" ? "Temp" : "Stored"),
      type,
      color: opts.color || "#3498db",
      jar: new SessionJar(),
    };
    this.sessions.set(session.id, session);
    if (session.type === "stored") this.persistStored();
    return session;
  }

  remove(id: string): void {
    const session = this.sessions.get(id);
    if (!session) return;
    this.sessions.delete(id);
    for (const [tabId, sid] of this.tabToSession) {
      if (sid === id) this.tabToSession.delete(tabId);
    }
    if (session.type === "stored") this.persistStored();
  }

  rename(id: string, name: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    const trimmed = (name || "").trim();
    if (!trimmed) return false;
    session.name = trimmed;
    if (session.type === "stored") this.persistStored();
    return true;
  }

  setColor(id: string, color: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    const trimmed = (color || "").trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) return false;
    session.color = trimmed;
    if (session.type === "stored") this.persistStored();
    return true;
  }

  clearCookies(id: string): void {
    const session = this.sessions.get(id);
    if (!session) return;
    session.jar = new SessionJar();
    if (session.type === "stored") this.persistStored();
  }

  assignTab(tabId: number, sessionId: string): boolean {
    if (!this.sessions.has(sessionId)) return false;
    this.tabToSession.set(tabId, sessionId);
    return true;
  }

  unassignTab(tabId: number): void {
    this.tabToSession.delete(tabId);
  }

  sessionForTab(tabId: number): Session | null {
    const sid = this.tabToSession.get(tabId);
    return sid ? (this.sessions.get(sid) ?? null) : null;
  }

  list(): SessionSummary[] {
    const out: SessionSummary[] = [];
    for (const s of this.sessions.values()) {
      out.push({
        id: s.id,
        name: s.name,
        type: s.type,
        color: s.color,
        cookieCount: s.jar.cookieCount(),
      });
    }
    return out;
  }

  summarize(session: Session): SessionSummary {
    return {
      id: session.id,
      name: session.name,
      type: session.type,
      color: session.color,
      cookieCount: session.jar.cookieCount(),
    };
  }

  persistStored(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      const out: PersistedSessionMap = {};
      for (const session of this.sessions.values()) {
        if (session.type !== "stored") continue;
        out[session.id] = {
          name: session.name,
          color: session.color,
          cookies: session.jar.serialize(),
        };
      }
      void browser.storage.local.set({ [STORAGE_KEY]: out });
    }, PERSIST_DEBOUNCE_MS);
  }
}
