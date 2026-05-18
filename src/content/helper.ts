// Injected into page world (web_accessible_resources). Overrides document.cookie
// so site JS sees the per-session jar instead of the browser's real cookies.
(function () {
  const tag = document.querySelector(
    'script[data-spawner-script="true"]',
  ) as HTMLScriptElement | null;
  let cookie = tag ? tag.getAttribute("data-spawner-init") || "" : "";
  if (tag) {
    tag.removeAttribute("data-spawner-init");
    tag.removeAttribute("data-spawner-script");
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (typeof event.data !== "string") return;
    let data: { type?: string; cookie?: string } | null;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }
    if (data && data.type === "SPAWNER_COOKIE_PUSH") {
      cookie = data.cookie || "";
    }
  });

  try {
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get(): string {
        return cookie;
      },
      set(value: unknown): void {
        if (value == null) return;
        const str = String(value);
        try {
          const first = str.split(";")[0].trim();
          const eq = first.indexOf("=");
          if (eq < 0) return;
          const name = first.slice(0, eq).trim();
          const val = first.slice(eq + 1).trim();
          const parts = cookie
            ? cookie
                .split(";")
                .map((s) => s.trim())
                .filter(Boolean)
            : [];
          let found = false;
          for (let i = 0; i < parts.length; i++) {
            if (parts[i].indexOf(name + "=") === 0) {
              parts[i] = name + "=" + val;
              found = true;
            }
          }
          if (!found) parts.push(name + "=" + val);
          cookie = parts.join("; ");
        } catch {}
        window.postMessage(
          JSON.stringify({ type: "SPAWNER_COOKIE_SET", cookie: str }),
          location.href,
        );
      },
    });
  } catch {}
})();
