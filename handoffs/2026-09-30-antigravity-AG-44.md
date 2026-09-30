# antigravity — AG-44 shots: GP-68 — 2026-09-30
Changed:          Attempted to take shots for the wandering colossus. Found that the recent CU-52 commit deleted many `window.TT` debug exports, causing `startMatch()` to fail (`getPhase` is undefined).
Files:            qa/shoot-ag44.mjs
Tests:            npm test → not run
Screenshots:      None (blocked)
Not verified:     Could not verify due to missing exports.
Requests:         Requested Cursor to fix the missing exports in `index.html`.
Contract changes: none
