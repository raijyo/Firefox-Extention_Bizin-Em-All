# Bizin-Em-All (Firefox)

This extension forces page fonts to the bundled `BIZUDGothic` family (with system-font fallback) so it works even if a user device has no custom font installed.

## What changed for Android/AMO readiness

- Added bundled fonts in `fonts/` and applied them via `@font-face` inside the injected style.
- Made content script use extension runtime URLs for font files (`browser.runtime.getURL`).
- Added `web_accessible_resources` so web pages can load extension packaged fonts in content-injected CSS.
- Added Promise-based storage access using Firefox `browser.storage.local`.
- Updated popup/status text to be plain ASCII (less risk of encoding problems during review).

## Files

- `manifest.json`: extension manifest (MV3)
- `content.js`: font override logic
- `popup.js`: toggle UI logic
- `popup.html`, `popup.css`: popup UI
- `fonts/BIZUDGothic-Regular.ttf`, `fonts/BIZUDGothic-Bold.ttf`: bundled fonts

## AMO / Android review checklist

1. No remote script/CSS loading
2. No tracking or analytics code
3. No data collection
4. No unnecessary host/network permissions
5. No native binary execution

If you use this repo for submission, include a concise note that all font files are shipped locally and no data is sent outside the browser.

## Build / test

```bash
# run unit tests
npm test

# linting/package steps are optional here and can be integrated as needed
```
