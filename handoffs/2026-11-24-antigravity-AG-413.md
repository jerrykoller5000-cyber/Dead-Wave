# antigravity — AG-413 Jerry direct: smooth minimap discovery reveal — 2026-11-24

Changed: Replaced the coarse 8 m binary `fillRect` fog grid on the minimap and Tab full map with a `512×512` (`~0.92 m/texel`) continuous reveal field featuring a quintic-feathered edge (`~25.2–43.4 m`), subtle deterministic organic edge and dark mist variation, anti-aliased circular valley rim masking, swept walk-capsule stamping (no gaps when moving, teleport jumps stay isolated), smooth real-time temporal mist dissolve (`~0.37 s` exponential ease), dirty-rect offscreen canvas blitting (1 `drawImage` instead of ~3,481 `fillRect`s), per-frame movement reveal with debounced `sessionStorage` writes (`0.5 s`), adaptive 30 Hz minimap redraw while moving/turning/dissolving (15 Hz idle), and a 280 ms smooth fade-in for newly discovered landmark markers/labels. Compact `v2` path packing stays backwards-compatible with legacy 8 m cell arrays.

Files: `ui/map-reveal.js`, `ui/map-reveal.test.mjs`, `ui/map-landmarks.js`, `index.html` (minimap reveal cadence and `drawMinimap` smooth dissolve wiring)

Tests:
- `node --test ui/map-reveal.test.mjs ui/map-landmarks.test.mjs ui/training-map.test.mjs ui/scouting.test.mjs` → 20 pass, 0 fail (including 5 new tests in `ui/map-reveal.test.mjs` covering smooth radial feather, capsule sweep vs teleport jump, temporal dissolve, `v2` + legacy `unpack`, and headless fallback).
- `node tools/check-players.mjs` → `check-players: 316 player.position reads, all in the allowed places`.
- UTF-8 / no-BOM / no-mojibake static check on `index.html`, `ui/map-reveal.js`, `ui/map-reveal.test.mjs`, `ui/map-landmarks.js` → all clean (`bom=false`, `mojibake=false`).
- Live GPU `t311` assertions via `node crew/crew.mjs slot run antigravity AG-413` → 7 pass, 0 fail (`the line he walked is on the map`, `the ground beside the line is revealed`, `the far valley stays unknown`, `walking into the tower clearing finds it (firetower)`, `the card names the tower (Fire Tower)`, `the card does not come up again`, `it was not found before he arrived`).
- Game-test slot rule (AGENTS.md rule 16): observed; all browser runs went through `node crew/crew.mjs slot run antigravity AG-413` with a single instance (`--jobs 1`) and never bypassed the queue.

Screenshots:
- Side-by-side contact sheet: `review/AG-413/comparison-sheet.png`
- Before (paired identical path/angles/viewports): `review/AG-413/before/minimap-step-0.png`..`minimap-step-5.png`, `minimap-settled.png`, `hud-day-3p.png`, `hud-day-1p.png`, `hud-night-3p.png`, `fullmap-canvas.png`, `fullmap-screen.png`, `hud-390.png`
- After (paired identical path/angles/viewports): `review/AG-413/after/minimap-step-0.png`..`minimap-step-5.png`, `minimap-settled.png`, `hud-day-3p.png`, `hud-day-1p.png`, `hud-night-3p.png`, `fullmap-canvas.png`, `fullmap-screen.png`, `hud-390.png`
- Perf HUD during identical GPU captures (`1280×720` WebGPU): Before `41–43 fps`, `low 21–27`, `hitch 75–81` → After `44 fps`, `low 26`, `hitch 46–49`.

UI principles check (`docs/ui-principles.md` §6, 0–5):
- Readability: 5 (terrain inside 25 m ring is 100% crisp; compass letters, blips, FOV cone, and labels read cleanly over dark mist by day, at night, and at 390 px)
- Hierarchy: 5 (player arrow, live threats, trails, and landmarks lead; fog veil stays subdued without bright outlines or reserved colors)
- Consistency: 5 (matches Branch dark charcoal-slate field-kit palette and smooth `< 0.3 s` fade timing)
- Placement: 5 (unchanged minimap frame and Tab full-map card; anti-aliased circular rim cleanly removes corner fog bleed)
- Safety: 5 (no alarm/destructive controls touched)
- Both views: 5 (verified in 3P `hud-day-3p.png` / `hud-night-3p.png` and 1P `hud-day-1p.png`)

Not verified:
- Standalone `tools/tests/run-all.mjs t311 t215` and an after-only screenshot refresh after the final 1-line `baseAlpha` tightening (`0.915 + cl * 0.045` → `0.945 + cl * 0.035` in `ui/map-reveal.js`) were deferred because `AG-410` held the `antigravity` slot followed immediately by Jerry's `MANUAL-GAME` session (rule 16: Jerry runs alone); live `t311` assertions (7/7) and UTF-8 checks passed, and the 2 `errors` logged in `review/AG-413/after/metrics.json` were solely from the capture harness dispatching synthetic `run-reset` without `runId` (0 gameplay errors).
- Session reload restoration across an actual browser tab refresh was verified in unit tests (`unpack` v2 and legacy) rather than a live page reload.

Requests: none.
Contract changes: none.
