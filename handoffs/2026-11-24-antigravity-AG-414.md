# antigravity — AG-414 Jerry direct: minimap appearance and functionality overhaul — 2026-11-24

Changed: Upgraded both the minimap and Tab full map with a single-pass cartographic topographic bake (earthy military-topo elevation ramp, central-difference NW hillshade, 4 m/16 m contour isolines, water bathymetry + shoreline bank edge, subtle woodland tree canopy cover, and dual-tone dirt roads/trails — 3× fewer `sampleHeight` calls than before), added smooth 3-level minimap zoom (`35 m / 50 m / 85 m` via `[`/`]`, `-`/`=`, footer click, or wheel), North-Up vs Rotating orientation toggle (`N` or footer click, persisted in `localStorage`), fading recent-footsteps breadcrumb trail, graduated 360° compass bezel with amber North caret and inner glass vignette, distinct tactical icons (green HQ house + off-screen home rim chevron, amber terminal plate, pulsing supply-drop radar beacon + off-screen rim arrow, brute/boss enemy tier rings, high-contrast player chevron), a sleek desktop-only tactical readout footer (`#minimapBar`, hidden cleanly at `<= 600 px` and in Training), and a dedicated subterranean Hollows warren sonar radar when underground (`hollow.below()`).

Files: `ui/minimap-kit.js` (new), `ui/minimap-kit.test.mjs` (new), `index.html` (minimap CSS/HTML/bake/blips/drawMinimap/drawFullMap/keybindings/`minimapDbg`)

Tests:
- `node --test ui/minimap-kit.test.mjs ui/map-reveal.test.mjs ui/map-landmarks.test.mjs ui/map-enemies.test.mjs ui/map-missions.test.mjs ui/build-alerts.test.mjs ui/scouting.test.mjs ui/training-map.test.mjs` → 47 pass, 0 fail.
- `node tools/check-players.mjs` → `check-players: 316 player.position reads, all in the allowed places`.
- `node tools/tests/run-all.mjs t311 t215 --jobs 1 --all-fails` (through `slot run antigravity AG-414`) → `t215` 4 pass 0 fail (63.6 s), `t311` 7 pass 0 fail (65.6 s); 2 checks: 11 pass, 0 fail.
- UTF-8 / no-BOM / no-mojibake static check on `index.html`, `ui/minimap-kit.js`, `ui/minimap-kit.test.mjs` → clean.
- Game-test slot rule (AGENTS.md rule 16): observed; all browser captures and `run-all.mjs` checks ran sequentially under one `node crew/crew.mjs slot run antigravity AG-414` lease (`--jobs 1`), 0 page errors on before and after.

Screenshots:
- Side-by-side contact sheet (Before vs After 50 m / 35 m / 85 m / North-Up / Tab Full Map / Hollows Sonar / HUD Bar): `review/AG-414/comparison-sheet.png`
- Before (AG-413 baseline): `review/AG-414/before/minimap-50m.png`, `hud-day-3p.png`, `fullmap-canvas.png`, `fullmap-screen.png`
- After (AG-414 overhaul): `review/AG-414/after/minimap-50m.png`, `minimap-35m.png`, `minimap-85m.png`, `minimap-northup.png`, `minimap-hollow.png`, `fullmap-canvas.png`, `fullmap-screen.png`, `hud-day-3p.png`, `hud-day-1p.png`, `hud-night-3p.png`, `hud-390.png`

UI principles check (`docs/ui-principles.md` §6, 0–5):
- Readability: 5 (topographic contours, dual-tone roads, canopy vs clearings, crisp icons, and tabular amber heading read cleanly by day, at night, in 1P/3P, and at `390×844` where `#minimapBar` hides cleanly)
- Hierarchy: 5 (player arrow, threats, HQ/supply bearings, and active missions lead; terrain relief, contours, and breadcrumbs stay softly layered underneath)
- Consistency: 5 (Branch dark field-green glass, olive borders, amber phosphor heading/caret, matching `#hudTopLeft` and `#ammo` plates)
- Placement: 5 (`#minimapFrame` keeps exact `164×164` desktop / `94×94` mobile bounds; `#minimapBar` sits `4 px` beneath on desktop with `~58 px` clearance above `#combo` and `display: none` at `<= 600 px`)
- Safety: 5 (no alarm or destructive controls touched; all new keybindings `N`, `[`, `]`, `-`, `=` confirmed unbound and gated by `!typingInField`)
- Both views: 5 (verified in 3P `hud-day-3p.png`, 1P `hud-day-1p.png`, night `hud-night-3p.png`, mobile `hud-390.png`, and underground `minimap-hollow.png`)

Not verified:
- Final 2.5 px North-caret-to-`N` clearance tweak (`inset = R - 18.5`, caret `-5.5`) was verified via the 47 unit tests after the GPU screenshot pass; screenshots show the pre-tweak 1 px contact at `R - 16`.
- Interactive mousewheel zoom over `#minimapFrame` and `localStorage` persistence across an actual browser page reload were verified in unit tests (`ui/minimap-kit.test.mjs`) rather than a manual browser reload.

Requests: none.
Contract changes: none.
