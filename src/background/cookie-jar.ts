import { Cookie, CookieJar, type SerializedCookieJar } from "tough-cookie";
import { getDomain } from "tldts";

/**
 * Browser-agnostic cookie shape used to move cookies between the native
 * browser store and a session jar. No browser API types leak into this file.
 */
export interface CookieDetail {
  name: string;
  value: string;
  domain: string; // no leading dot
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: "strict" | "lax" | "none";
  hostOnly: boolean;
  expires?: number; // epoch seconds; undefined => session cookie
}

/**
 * Per-session cookie jar backed by tough-cookie. Pure data; no browser API
 * dependency. The wrapper exposes the small surface the rest of the extension
 * needs (request header / document.cookie / serialization).
 */
export class SessionJar {
  private jar: CookieJar;

  constructor(serialized?: SerializedCookieJar | null) {
    if (serialized) {
      this.jar = CookieJar.deserializeSync(serialized);
    } else {
      this.jar = new CookieJar(undefined, { looseMode: true });
    }
  }

  setFromHeader(header: string, requestUrl: string): void {
    try {
      this.jar.setCookieSync(header, requestUrl, { ignoreError: true });
    } catch {
      // ignore malformed Set-Cookie values
    }
  }

  setFromDocument(value: string, requestUrl: string): void {
    try {
      this.jar.setCookieSync(value, requestUrl, {
        ignoreError: true,
        http: false,
      });
    } catch {
      // ignore
    }
  }

  /** Insert a single cookie described by a browser-agnostic detail. */
  setFromCookie(detail: CookieDetail): void {
    const scheme = detail.secure ? "https" : "http";
    const url = `${scheme}://${detail.domain}${detail.path || "/"}`;
    try {
      const cookie = new Cookie({
        key: detail.name,
        value: detail.value,
        domain: detail.domain,
        path: detail.path || "/",
        secure: detail.secure,
        httpOnly: detail.httpOnly,
        sameSite: detail.sameSite,
        hostOnly: detail.hostOnly,
        expires:
          detail.expires == null ? "Infinity" : new Date(detail.expires * 1000),
      });
      this.jar.setCookieSync(cookie, url, { ignoreError: true });
    } catch {
      // skip malformed cookie
    }
  }

  /** Rebuild the jar from a full list of details (small jars; avoids
   * fragile tough-cookie store-key matching). */
  private replace(details: CookieDetail[]): void {
    this.jar = new CookieJar(undefined, { looseMode: true });
    for (const d of details) this.setFromCookie(d);
  }

  /** Remove the cookie identified by name+domain+path. */
  removeCookie(name: string, domain: string, path: string): void {
    const d = domain.replace(/^\./, "");
    const p = path || "/";
    this.replace(
      this.exportCookies().filter(
        (c) => !(c.name === name && c.domain === d && (c.path || "/") === p),
      ),
    );
  }

  /** Insert or replace a cookie. `oldKey` (the cookie's prior identity) is
   * removed first, so renaming name/domain/path works. With no `oldKey`,
   * any existing cookie sharing the new identity is overwritten. */
  upsertCookie(
    detail: CookieDetail,
    oldKey?: { name: string; domain: string; path: string },
  ): void {
    const key = oldKey ?? {
      name: detail.name,
      domain: detail.domain,
      path: detail.path,
    };
    const kd = key.domain.replace(/^\./, "");
    const kp = key.path || "/";
    const nd = detail.domain.replace(/^\./, "");
    const np = detail.path || "/";
    const kept = this.exportCookies().filter(
      (c) =>
        !(c.name === key.name && c.domain === kd && (c.path || "/") === kp) &&
        !(c.name === detail.name && c.domain === nd && (c.path || "/") === np),
    );
    kept.push({ ...detail, domain: nd, path: np });
    this.replace(kept);
  }

  /** Export every cookie in the jar as browser-agnostic details. */
  exportCookies(): CookieDetail[] {
    const cookies = this.jar.serializeSync()?.cookies ?? [];
    const out: CookieDetail[] = [];
    for (const c of cookies) {
      const raw = c as {
        key?: string;
        value?: string;
        domain?: string;
        path?: string;
        secure?: boolean;
        httpOnly?: boolean;
        sameSite?: string;
        hostOnly?: boolean;
        expires?: string;
      };
      const domain = (raw.domain ?? "").replace(/^\./, "");
      if (!domain || raw.key == null) continue;
      const sameSite =
        raw.sameSite === "strict" ||
        raw.sameSite === "lax" ||
        raw.sameSite === "none"
          ? raw.sameSite
          : undefined;
      let expires: number | undefined;
      if (raw.expires && raw.expires !== "Infinity") {
        const ms = Date.parse(raw.expires);
        if (!Number.isNaN(ms)) expires = Math.floor(ms / 1000);
      }
      out.push({
        name: raw.key,
        value: raw.value ?? "",
        domain,
        path: raw.path || "/",
        secure: !!raw.secure,
        httpOnly: !!raw.httpOnly,
        sameSite,
        hostOnly: !!raw.hostOnly,
        expires,
      });
    }
    return out;
  }

  /** Cookie header for outgoing HTTP request. Includes HttpOnly. */
  requestHeader(requestUrl: string): string {
    return this.jar.getCookieStringSync(requestUrl);
  }

  /** document.cookie string for page world. Excludes HttpOnly. */
  documentString(requestUrl: string): string {
    return this.jar.getCookieStringSync(requestUrl, { http: false });
  }

  cookieCount(): number {
    return this.jar.serializeSync()?.cookies.length ?? 0;
  }

  cookieDomains(): string[] {
    const cookies = this.jar.serializeSync()?.cookies ?? [];
    const set = new Set<string>();
    for (const c of cookies) {
      const raw = (c as { domain?: unknown }).domain;
      const d = (typeof raw === "string" ? raw : "")
        .toLowerCase()
        .replace(/^\./, "");
      if (!d) continue;
      const root = getDomain(d) || d;
      set.add(root);
    }
    return [...set].sort();
  }

  serialize(): SerializedCookieJar {
    return this.jar.serializeSync()!;
  }
}
