// Content script. Asks background if this tab is in a session.
// If yes, injects helper.js into page world to override document.cookie.
// Also manages optional tab-title prefix.
(function () {
  const api = typeof browser !== "undefined" ? browser : chrome;

  let prefix = "";
  let lastSetByUs = "";
  let titleObserver = null;

  function computePrefix(sessionName) {
    return sessionName ? "[" + sessionName + "] " : "";
  }

  function applyPrefix() {
    if (!prefix) return;
    const t = document.title || "";
    if (t === lastSetByUs) return;
    if (t.indexOf(prefix) === 0) return;
    const bare = stripAnyPrefix(t);
    const next = prefix + bare;
    lastSetByUs = next;
    document.title = next;
  }

  function stripAnyPrefix(t) {
    // strip a previously applied [Name] prefix so renames don't double-stack
    return t.replace(/^\[[^\]]+\]\s+/, "");
  }

  function clearPrefix() {
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

  function startTitleObserver() {
    if (titleObserver) return;
    const head = document.head || document.documentElement;
    if (!head) return;
    titleObserver = new MutationObserver(function () {
      applyPrefix();
    });
    titleObserver.observe(head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    applyPrefix();
  }

  function setupPrefix(enabled, sessionName) {
    if (enabled && sessionName) {
      const next = computePrefix(sessionName);
      if (next !== prefix) {
        // session renamed or just enabled
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

  api.runtime.sendMessage({ type: "isVirtualSession" }, function (resp) {
    if (!resp || !resp.virtual) return;

    const script = document.createElement("script");
    script.src = api.runtime.getURL("src/content/helper.js");
    script.setAttribute("data-spawner-init", resp.init || "");
    script.setAttribute("data-spawner-script", "true");
    const parent = document.head || document.documentElement;
    parent.appendChild(script);
    script.parentNode && script.parentNode.removeChild(script);

    setupPrefix(resp.prefixTabName, resp.sessionName);

    window.addEventListener("message", function (event) {
      if (event.source !== window) return;
      if (typeof event.data !== "string") return;
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
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
          function (r) {
            window.postMessage(
              JSON.stringify({
                type: "SPAWNER_COOKIE_RESPONSE",
                id: data.id,
                cookie: (r && r.cookie) || "",
              }),
              location.href,
            );
          },
        );
      }
    });
  });

  api.runtime.onMessage.addListener(function (msg) {
    if (!msg || msg.type !== "settingsUpdated") return;
    setupPrefix(msg.payload.prefixTabName, msg.payload.sessionName);
  });
})();
