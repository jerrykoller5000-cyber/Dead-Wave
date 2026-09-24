# cursor — CU-4 loader slice — 2026-09-24
Changed: The load channel, `yieldToBrowser`, and `whileHiddenFramesRun` moved into `core/loader.js`. The page still calls `DWLoad._begin()` and the splash progress line.
Files: core/loader.js, index.html (loader)
Tests: `node tools/tests/run-all.mjs t45 --jobs 1` → 8 pass, 0 fail, 6.7 s. Full npm test not re-run.
Screenshots: none. No visible change.
Not verified: a background-tab load. The hidden-tab pump moved with the channel and was not re-timed.
Requests: none. No whole-file freeze: Claude is in `index.html` (world: POI build, TT exports).
Contract changes: none this slice. Claude is in `docs/contracts.md`. The load channel section there already describes `DWLoad`; it now lives in `core/loader.js`.
Commit: not committed. Claude is still in `index.html`.
