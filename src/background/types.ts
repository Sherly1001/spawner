import type { SessionJar } from "./cookie-jar";

export type SessionType = "temp" | "stored";

export interface Session {
  id: string;
  name: string;
  type: SessionType;
  color: string;
  jar: SessionJar;
}

export interface SessionSummary {
  id: string;
  name: string;
  type: SessionType;
  color: string;
  cookieCount: number;
  domains: string[];
}

export interface Settings {
  prefixTabName: boolean;
  colorizeIcon: boolean;
}

export interface CreateSessionOptions {
  name?: string;
  type?: SessionType;
  color?: string;
}

export interface StoredSessionRecord {
  name: string;
  color: string;
  cookies: unknown;
}
