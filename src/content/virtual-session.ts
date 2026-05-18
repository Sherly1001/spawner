// Content script. Asks background if this tab is in a session.
// If yes, injects helper.js into page world to override document.cookie.
// Also manages optional tab-title prefix.
declare const browser: typeof chrome | undefined;

type IsVirtualResponse = {
  virtual: boolean;
  init?: string;
  prefixTabName?: boolean;
  sessionName?: string;
};

type SettingsUpdatedMsg = {
  type: "settingsUpdated";
  payload: { prefixTabName: boolean; sessionName: string };
};

(function () {
  const api: typeof chrome =
    typeof browser !== "undefined" ? (browser as typeof chrome) : chrome;

  let prefix = "";
  let lastSetByUs = "";
  let titleObserver: MutationObserver | null = null;

  function computePrefix(sessionName: string): string {
    return sessionName ? "[" + sessionName + "] " : "";
  }

  function stripAnyPrefix(t: string): string {
    return t.replace(/^\[[^\]]+\]\s+/, "");
  }

  function applyPrefix(): void {
    if (!prefix) return;
    const t = document.title || "";
    if (t === lastSetByUs) return;
    if (t.indexOf(prefix) === 0) return;
    const bare = stripAnyPrefix(t);
    const next = prefix + bare;
    lastSetByUs = next;
    document.title = next;
  }

  function clearPrefix(): void {
    if (titleObserver) {
      titleObserver.disconnect();
      titleObserver = null;
    }
    if (!prefix) return;
    const t = document.title || "";
    if (t.indexOf(prefix) === 0) {
      lastSetByUs = "";
      document.title = t.slice(prefix.length);
    }
    prefix = "";
  }

  function startTitleObserver(): void {
    if (titleObserver) return;
    const head = document.head || document.documentElement;
    if (!head) return;
    titleObserver = new MutationObserver(() => applyPrefix());
    titleObserver.observe(head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    applyPrefix();
  }

  function setupPrefix(enabled: boolean, sessionName: string): void {
    if (enabled && sessionName) {
      const next = computePrefix(sessionName);
      if (next !== prefix) {
        clearPrefix();
        prefix = next;
      }
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startTitleObserver, {
          once: true,
        });
      } else {
        startTitleObserver();
      }
    } else {
      clearPrefix();
    }
  }

  api.runtime.sendMessage(
    { type: "isVirtualSession" },
    (resp: IsVirtualResponse | undefined) => {
      if (!resp || !resp.virtual) return;

      const script = document.createElement("script");
      script.src = api.runtime.getURL("dist/content/helper.js");
      script.setAttribute("data-spawner-init", resp.init || "");
      script.setAttribute("data-spawner-script", "true");
      const parent = document.head || document.documentElement;
      parent.appendChild(script);
      script.parentNode && script.parentNode.removeChild(script);

      setupPrefix(!!resp.prefixTabName, resp.sessionName || "");

      window.addEventListener("message", (event) => {
        if (event.source !== window) return;
        if (typeof event.data !== "string") return;
        let data: { type?: string; id?: string; cookie?: string } | null;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (!data || !data.type) return;

        if (data.type === "SPAWNER_COOKIE_SET") {
          api.runtime.sendMessage({
            type: "setCookieFromPage",
            payload: { cookie: data.cookie, url: location.href },
          });
        } else if (data.type === "SPAWNER_COOKIE_REQUEST") {
          api.runtime.sendMessage(
            { type: "getCookieForPage", payload: { url: location.href } },
            (r: { cookie?: string } | undefined) => {
              window.postMessage(
                JSON.stringify({
                  type: "SPAWNER_COOKIE_RESPONSE",
                  id: data!.id,
                  cookie: (r && r.cookie) || "",
                }),
                location.href,
              );
            },
          );
        }
      });
    },
  );

  api.runtime.onMessage.addListener((msg: SettingsUpdatedMsg) => {
    if (!msg || msg.type !== "settingsUpdated") return;
    setupPrefix(msg.payload.prefixTabName, msg.payload.sessionName);
  });
})();
