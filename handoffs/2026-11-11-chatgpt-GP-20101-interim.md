# chatgpt — GP-20101 Training melee dummy, interim — 2026-11-11

Changed: Staged AG-308's dummy at the rear of the firing apron, with a solid push-out, exact surface traces for blade, saw and rounds, hit sound, and a counter/reset in the range console. Claude Director reprioritized GP-20102 ahead of this card before browser verification.
Files: `game/training-dummy.js`, `index.html` (Training integration and hit routing), `ui/range-feature.js`, `ui/range-console.js`, `ui/strings.js`.
Tests: `node --check` passed for the new game module and three UI modules. Browser/game checks not run; this is unfinished staging.
Screenshots: none yet.
Not verified: Exact model integration, placement, contact, console UI and reset, four lights, drills and performance all need PC-slot testing on resume. AG-308's API changed while it was being built; re-read its final module and the shared index before saving again.
Requests: Asked Antigravity for the frozen API and feedback on placement x=-5,z=-2.8, and AG-309 to warm the dummy's marks in its loaned warm-compile section.
Contract changes: none.
