import type { SessionStore } from "./sessions";

const ALL_URLS: chrome.webRequest.RequestFilter = {
  urls: ["<all_urls>"],
};

function isChromeRuntime(): boolean {
  return (
    typeof navigator !== "undefined" && !navigator.userAgent.includes("Firefox")
  );
}

/**
 * webRequest hooks:
 *   - onBeforeSendHeaders: replace outgoing Cookie with the session jar's value
 *   - onHeadersReceived:   capture Set-Cookie into the jar, strip from response
 *                          so the browser never persists it
 *
 * Chrome requires the 'extraHeaders' opt-in to read/modify Cookie/Set-Cookie.
 * Firefox rejects it, so we add it only when running on Chromium.
 */
export function setupWebRequest(store: SessionStore): void {
  const extra = isChromeRuntime() ? (["extraHeaders"] as const) : [];

  const reqOpts = ["blocking", "requestHeaders", ...extra] as const;
  const resOpts = ["blocking", "responseHeaders", ...extra] as const;

  chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
      if (details.tabId < 0) return {};
      const session = store.sessionForTab(details.tabId);
      if (!session) return {};

      const headers = (details.requestHeaders ?? []).filter(
        (h) => h.name.toLowerCase() !== "cookie",
      );
      const cookieStr = session.jar.requestHeader(details.url);
      if (cookieStr) headers.push({ name: "Cookie", value: cookieStr });

      return { requestHeaders: headers };
    },
    ALL_URLS,
    reqOpts as unknown as chrome.webRequest.OnBeforeSendHeadersOptions[],
  );

  chrome.webRequest.onHeadersReceived.addListener(
    (details) => {
      if (details.tabId < 0) return {};
      const session = store.sessionForTab(details.tabId);
      if (!session) return {};

      const kept: chrome.webRequest.HttpHeader[] = [];
      let changed = false;

      for (const header of details.responseHeaders ?? []) {
        if (header.name.toLowerCase() !== "set-cookie") {
          kept.push(header);
          continue;
        }
        // Firefox may bundle multiple cookies in one header separated by '\n'.
        for (const line of String(header.value ?? "").split("\n")) {
          if (line.trim()) session.jar.setFromHeader(line, details.url);
        }
        changed = true;
      }

      if (changed && session.type === "stored") store.persistStored();
      return { responseHeaders: kept };
    },
    ALL_URLS,
    resOpts as unknown as chrome.webRequest.OnHeadersReceivedOptions[],
  );
}
