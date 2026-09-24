# cursor — CU-4 audio slice — 2026-09-24
Changed: `AudioSys` moved into `core/audio.js`. The page imports it. The engine does not read game state; it still mutes from `window.DWOpening`.
Files: core/audio.js, index.html (audio), docs/contracts.md
Tests: `node tools/tests/run-all.mjs t45 --jobs 1` → 8 pass, 0 fail, 6.8 s. Full npm test not re-run.
Screenshots: none. No visible change.
Not verified: a full suite run; the music director, which stays in the page.
Requests: none. The full freeze was not used: Grokbot is in `index.html` (builds), so this slice was checked in as `index.html (audio)` only (D-15).
Contract changes: an Audio section in `docs/contracts.md`. Claude keeps that file.
Commit: not committed. Grokbot is still in `index.html` (builds).
