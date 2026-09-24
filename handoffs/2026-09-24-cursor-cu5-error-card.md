# cursor — CU-5 error card — 2026-09-24
Changed: An on-screen card shows the latest uncaught error or rejection, with a Dismiss button. It sits above the game and does not replace the opening screen's own load failure.
Files: index.html (error card)
Tests: `node tools/tests/run-all.mjs t45 --jobs 1` → 8 pass, 0 fail, 7.1 s. The card itself was not clicked in a browser.
Screenshots: none.
Not verified: a thrown error in the live game. The collider grid and the day-start save are not started. Claude is in `index.html` (puddles), so this was not committed.
Requests: none.
Contract changes: none.
