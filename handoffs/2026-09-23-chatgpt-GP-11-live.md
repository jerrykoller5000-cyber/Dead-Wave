# chatgpt — GP-11 Live landmark objectives — 2026-09-23

Changed: Seven landmarks now have live discovery, map markers, one HUD tracker, six-second radio repair and capacity-aware supply choices. Partial supplies stay at their site; repeat visits cannot duplicate grants, and props follow objective state.
Files: index.html (HUD objectives), game/objectives.js, ui/objectives-runtime.js, ui/objectives.js, ui/objectives.css, ui/strings.js, ui/objectives-state.test.mjs, ui/objectives-live.browser.mjs.
Tests: npm test not run: documented Chrome CDP Page.enable limitation in AGENTS.md. `node --test ui/*.test.mjs` → tests 69, pass 69, fail 0. `node ui/objectives-live.browser.mjs` → PASS GP-11 production integration: real E hold/release, damage cancellation, seven radio reveals, map tracking, partial/full/exact remaining supply claims, no repeat grants, pack lock, prop states, reset and mobile overflow.
Screenshots: Claude outputs/shots/gp11-live/{before,radio,map,partial,mobile}.png, captured through Playwright with the stand-in renderer. Inspected map and mobile; new controls fit. These are not tools/shoot.mjs comparisons or evidence of rendered world fidelity.
Not verified: Real GPU, route playthrough, load/FPS budgets and tools/shoot comparisons need Cursor/Antigravity. Atomic save/restore of objectives plus inventory/receipts awaits CU-5; no separate localStorage save was added.
Requests: Cursor: CU-5 atomic save and shared suite. Antigravity: real routes, radio/partial claims, world props, desktop/mobile/night shots. Sent through crew.mjs.
Contract changes: None; consumes D-16 supplies/damage, D-17 interaction and CL-15 props. Internal objectiveRuntime save/restore adapter offered to Cursor for CU-5.

## Behaviour and checks

- Ordinary discovery within 24 m; repair reveals remaining sites. Radio never grants Field Intel. Its optional ammo reward uses a separate E press after repair.
- Owner's gameplay hold timer drives six seconds. Release, actual damagePlayer hit, modal and lost reach stop progress. No world clock inference or TT in production.
- Owned ammo choices, MedPens and grenades use grantSupply receipts scoped to run plus site/attempt. Positive partial claim fixes its pack; zero acceptance permits another pack. Full feedback still prints the exact remainder.
- Runtime polls seven read-only owner snapshots at 10 Hz and avoids repaint when state is unchanged. Input edge runs after core E processing; map projection stays with existing game orientation.
- Browser check reaches all seven owner approach coordinates (teleports only in the test), completes every non-Ranger site, verifies Ranger partial lock, collects the medical remainder exactly once, resets state and finds no page errors. This does not claim a player route or live enemy playthrough.
- Existing crowded mobile top HUD is unchanged; objective tracker itself fits beneath the minimap. QA should assess it in the rendered game.
- New state test verifies authoritative hold time and owner reset. Existing expectations were not weakened.

Browser dependency: NODE_PATH=C:/Users/Zero/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules. Uses installed Edge; no new dependency or build step.
