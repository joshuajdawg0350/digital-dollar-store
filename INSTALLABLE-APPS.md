# Installable Apps — the DDS standard

**Rule (Joshua's catch, 2026-11-18):** every app door under `/apps/<slug>/` ships
INSTALLABLE. A buyer who purchases must be able to put a real icon on their phone
home screen. A door without a manifest, icons, and a service worker can never offer
"Install app" — that is a broken delivery, not a cosmetic gap.

## What every app door must carry

In the app's own folder (`apps/<slug>/`):

| File | What it is |
|---|---|
| `manifest.webmanifest` | name + short_name = the product name, `display: standalone`, `start_url: "."`, `scope: "."`, `background_color: #04060A`, `theme_color: #0096FF` (electric blue on near-black, house palette), icons below |
| `icon-192.png` | 192×192 PNG, purpose `any` |
| `icon-512.png` | 512×512 PNG, purpose `any` |
| `icon-maskable-512.png` | 512×512 PNG, purpose `maskable` — art scaled to ~80% centered on `#04060A` so the OS mask never clips the subject |
| `apple-touch-icon.png` | 180×180 PNG for iPhone home screens |
| `sw.js` | Minimal service worker: precaches the app page + manifest + icons on install, cache-first for same-origin GETs (status 200 only), network fallback, old caches deleted on activate. Cache name: `<slug>-install-v1` — bump the version when the app file changes shape. |

In the app's `index.html` head:

```html
<meta name="theme-color" content="#04060A">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="<Product Name>">
```

A `data:`-URI manifest does NOT count — Chrome ignores it for installability
(Pocket Player and Droppin Beats shipped that way and could never be installed).

## The in-app button

Every app carries a visible **"📲 Put this on your home screen"** button (the
`#installBar` block — CSS + HTML + JS are identical across doors; copy them from
`apps/draw-pad/index.html`). Behavior:

- If the browser fires `beforeinstallprompt`, the button fires the real install prompt.
- Otherwise the button opens plain-word steps for the visitor's device:
  - Android: "Tap the ⋮ menu at the top right, then tap 'Add to Home screen.'"
  - iPhone: "Tap the Share button, then 'Add to Home Screen.'"
- The bar hides itself when the app is already running installed (standalone mode)
  and after a successful install (`appinstalled`).
- The same script registers `sw.js`.
- **Placement warning:** put the bar at the top of `<body>` or right after the app's
  real header — never after a `</header>` that lives inside a hidden view/panel
  (Moving Box Finder's header sits inside its hidden Info view; Droppin Beats'
  header sits inside a tour column — both swallowed the bar on the first pass).
  Verify with a rendered screenshot, not just the DOM.

## The thanks page

Every product's `thanks-*.html` page carries a **"Get the icon on your home
screen"** block immediately after the Open button and before the review-ask
block: one line on why (one tap, no browser first), the three plain steps
(open the app → Android ⋮ steps / iPhone Share steps), and a button that opens
the app. Model: `thanks-draw-pad.html` (`.install-ask` styles).

## Icons

Icons are PURPOSE-DESIGNED app icons, picked by Joshua before they go live:
bold single subject, chrome/silver + electric blue / neon color on near-black,
fills the frame, readable at tiny size, NO text. (Standard set 2026-11-18:
Draw Pad = chrome-ringed color wheel with chrome brush; Create with J-Dawg =
chrome palette with neon paint splashes.) Cropping store cover art into a square
is NOT acceptable icon art — it slices cover text in half. Doors rolled out in
the 2026-11-18 Phase 2 pass use each product's existing square art as a
placeholder until designed icons are picked for them.

## Verification (proof or it didn't happen)

Before calling a door installable, check headlessly (Chromium, local serve):

1. Manifest parses and is the one linked from the live page.
2. Every icon URL returns 200.
3. The service worker registers and reaches `activated` with zero console errors.
4. `Page.getInstallabilityErrors` returns an empty list.
5. Screenshot at 390×844 AND 360×740 with the install button visibly rendered
   (non-zero size) and the steps panel opening on tap — and actually view it.
6. After publishing: curl-verify the LIVE page, manifest, SW, and icons
   (byte-compare against local). Commit ≠ live.

Real on-phone install stays UNCHECKED until a finger on a real phone confirms
the icon lands on the home screen.

## Doors covered (2026-11-18)

Phase 1: `draw-pad`, `create-with-j-dawg` (approved icons, thanks blocks).
Phase 2: `auto-tune-data`, `plain-talk`, `credential-compass`,
`caption-hook-studio`, `seller-photo-studio`, `pocket-player`, `audio-fixer`,
`ringtone-maker`, `speaker-rescue`, `moving-box-finder`, `droppin-beats`
(placeholder icons from each product's own art), `funny-maps` (manifest/SW/icons
already met the standard; install bar added inside its control sheet).
Viewer doors (`classic-games`, `templates-pack`, `watch-faces-pack-1`) are
delivery viewers, not standalone apps — out of scope unless Joshua says otherwise.
