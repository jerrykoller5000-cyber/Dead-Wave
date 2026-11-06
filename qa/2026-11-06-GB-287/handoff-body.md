# GB-287: gate-open caption wraps within the screen (AG-242)

Grokbot, 2026-11-06.

Changed:          Centered `#bigBanner` gate-open titles (empty-sub / `.center`) now wrap inside a screen margin instead of `white-space: nowrap` + `width: max-content`, which clipped AG-242's open-gate lines at 1920. Non-center rail banners untouched.
Files:            ui/hud-layout.css (`#noticeRail > #bigBanner.center` width/max-width/padding; `.t` clamp font, `white-space: normal`, `overflow-wrap: anywhere`); index.html base `#bigBanner.center` aligned the same way (noticeRail still wins when mounted).
Tests:            slot realtest t215 t95 --all: 13/0; t215 again after hud-layout fix 4/0; slot `qa/2026-11-06-GB-287/capture2.mjs` text-range fit at 1920/1280/390: 3/0 (ws=normal; fonts 44 / 38.88 / 20.19). node --check inline scripts OK; dupscan 6-line blocks still 51.
Screenshots:      qa/2026-11-06-GB-287/banner-1920.png, banner-1280.png, banner-390.png
Not verified:     Full live ?gates=1 gate-open tour (AG-242 path); long suite (D-114).
Requests:         none
Contract changes: none

## Redo (Claude rejected title-screen shots)

Claude, 21:45Z: banner-1920/1280/390.png showed the title/Play screen, not the gate-open caption. Cause: `capture.mjs` / `capture2.mjs` injected `#bigBanner` on the title screen and never called `startMatch`.

New proof: `qa/2026-11-06-GB-287/capture-inmatch.mjs` — for each width, serves ROOT, launches CDP (offscreen), loads `index.html?debug=1&raf=timer&gates=1`, dismisses DWOpening, runs `tools/tests/lib.js` `startMatch` to prep (menu `#modeSelect.show` off), then raises the empty-sub gate-open caption (`chain.relay.open`: "Sato's key frees the mast yard gate. The relay is within reach.") via the `#bigBanner` DOM path with color `#d7c6a4` (same as `showBanner(..., '', …)`). Asserts text range fits with margin; overwrites the three PNGs.

Slot: `node crew/crew.mjs slot run grokbot GB-287 --checks "in-match gate-open captions 1920/1280/390" -- node qa/2026-11-06-GB-287/capture-inmatch.mjs`
Result: **3 pass / 0 fail** (exit 0).
- PASS 1920 font=44px ws=normal textW=887 textH=168 L/R=521/1408 vw=1920 phase=prep menuShow=false
- PASS 1280 font=38.88px ws=normal textW=975 textH=99 L/R=157/1131 vw=1280 phase=prep menuShow=false
- PASS 390 font=20.19px ws=normal textW=323 textH=102 L/R=36/358 vw=390 phase=prep menuShow=false

Visual check (Read): banner-1920 and banner-390 show in-match HUD (NIGHT 1 - PREP, cash/ammo/minimap) with the large spaced uppercase caption wrapping centered — not the title/Play screen. CSS wrap left as-is (shots prove wrap works). No git; no index.html re-edit.
