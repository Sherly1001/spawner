# Spawner

Minimal multi-session browser extension (Chrome + Firefox, Manifest V2).
Inspired by SessionBox. Per-tab cookie jars override the browser's real cookies
so you can be logged into the same site as multiple users in different tabs.

## Features

- **Temporary sessions** — in-memory, vanish when the browser closes
- **Stored sessions** — persisted via `chrome.storage.local`
- **Convert session type** — switch any session between temp and stored on the fly
- **Per-tab isolation** — assign any tab to any session
- **HTTP + `document.cookie`** interception — full isolation, not just network
- **Cookie flush** — pull the current site's real browser cookies into a session,
  or push a session's cookies back out to the real browser (copy, non-destructive)
- **No accounts, no login, no telemetry**

## Build

The background and content scripts are plain JS (no build). Only the popup uses
React + Vite.

```sh
pnpm install
pnpm build
```

(Direct vite invocation bypasses pnpm's deps-verify check that complains about
esbuild's optional build script. `pnpm build` works too if you run
`pnpm approve-builds` once.)

Output goes to `dist/` (popup `index.html` + assets, plus the bundled `background.js`). The manifest already points there.

## Load (Chrome)

1. Visit `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the project root

## Load (Firefox)

1. Visit `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on** → pick `manifest.json`

For permanent install on Firefox, sign the extension via `web-ext`.

## Icons

Drop `icon16.png`, `icon48.png`, `icon128.png` into `icons/`. Without them,
the extension still loads but uses Chrome's default icon.

## How it works

1. Popup creates a session (temp or stored). Each session owns a `CookieJar`.
2. Popup says "open URL in session X" → background opens a new tab and tags it.
3. `webRequest.onBeforeSendHeaders` strips the real `Cookie` header and replaces
   it with cookies from that session's jar.
4. `webRequest.onHeadersReceived` captures `Set-Cookie` responses into the jar
   and strips them so the browser never stores them.
5. A content script injects `helper.js` into the page world to override
   `document.cookie`, so client-side JS sees the per-session jar too.
6. New tabs opened from a session-tab (target=\_blank) inherit the session.

## Limitations

- MV2 only. Chrome will eventually deprecate MV2 for general extensions.
- `chrome.storage.local` has a ~5 MB cap. Very heavy cookie jars may not fit.
- Tab → session assignments live in memory. After a browser restart, stored
  sessions still exist but tabs must be re-opened from the popup.
- IndexedDB and localStorage are NOT isolated (cookies only).
