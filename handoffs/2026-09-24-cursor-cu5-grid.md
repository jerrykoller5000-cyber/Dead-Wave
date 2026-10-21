# cursor — CU-5 collider grid — 2026-09-24
Changed: Trunks, rocks and landmark solids are filed in 8 m squares. `resolveStaticProps` only tests the squares around the body. The push math is the same.
Files: index.html (colliders)
Tests: `node tools/tests/run-all.mjs t45 --jobs 1` → 8 pass, 0 fail, 9.5 s. The page loaded, so the new grid parsed.
Screenshots: none. Nothing visible changed.
Not verified: a body pushed through a dense stand of trees, where a shove could travel farther than one extra square. The day-start save is not started. Claude is in `index.html` (puddles), so this is not committed.
Requests: none.
Contract changes: none.
