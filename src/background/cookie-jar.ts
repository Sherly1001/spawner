import { CookieJar, type SerializedCookieJar } from "tough-cookie";
import { getDomain } from "tldts";

/**
 * Per-session cookie jar backed by tough-cookie. Pure data; no browser API
 * dependency. The wrapper exposes the small surface the rest of the extension
 * needs (request header / document.cookie / serialization).
 */
export class SessionJar {
  private readonly jar: CookieJar;

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
