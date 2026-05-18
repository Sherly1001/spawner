// Injected into page world (web_accessible_resources). Overrides document.cookie
// so site JS sees the per-session jar instead of the browser's real cookies.
(function () {
  var tag = document.querySelector('script[data-spawner-script="true"]');
  var cookie = tag ? tag.getAttribute("data-spawner-init") || "" : "";
  if (tag) {
    tag.removeAttribute("data-spawner-init");
    tag.removeAttribute("data-spawner-script");
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window) return;
    if (typeof event.data !== "string") return;
    var data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      return;
    }
    if (data && data.type === "SPAWNER_COOKIE_PUSH") {
      cookie = data.cookie || "";
    }
  });

  try {
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: function () {
        return cookie;
      },
      set: function (value) {
        if (value == null) return;
        var str = String(value);
        try {
          var first = str.split(";")[0].trim();
          var eq = first.indexOf("=");
          if (eq < 0) return;
          var name = first.slice(0, eq).trim();
          var val = first.slice(eq + 1).trim();
          var parts = cookie
            ? cookie
                .split(";")
                .map(function (s) {
                  return s.trim();
                })
                .filter(Boolean)
            : [];
          var found = false;
          for (var i = 0; i < parts.length; i++) {
            if (parts[i].indexOf(name + "=") === 0) {
              parts[i] = name + "=" + val;
              found = true;
            }
          }
          if (!found) parts.push(name + "=" + val);
          cookie = parts.join("; ");
        } catch (e) {}
        window.postMessage(
          JSON.stringify({
            type: "SPAWNER_COOKIE_SET",
            cookie: str,
          }),
          location.href,
        );
      },
    });
  } catch (e) {}
})();
