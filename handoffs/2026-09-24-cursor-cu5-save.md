# cursor — CU-5 day-start save — 2026-09-24
Changed: Each morning is written to `localStorage` (`tt_day_start`): the day, cash, ammo, owned weapons, Field Intel, supply receipts, the guardian first-blood flag, and the objective ledger. The next Play comes back to that morning. Quitting to the menu throws it away.
Files: index.html (saves), tools/tests/t62.js
Tests: `node tools/tests/run-all.mjs t62 --jobs 1` → 6 pass, 0 fail, 18.0 s.
Screenshots: none. Nothing visible changed.
Not verified: a real reload in the browser. Builds, the world, and the prep-checklist rows are not in the ledger. The checklist rebuilds from the restored cash and ammo. The error card and the 8 m collider grid were already in the phase-1 commit.
Requests: none.
Contract changes: none. `saveDayStart`, `loadDayStart`, and `clearDayStart` are on `TT` for tests.
