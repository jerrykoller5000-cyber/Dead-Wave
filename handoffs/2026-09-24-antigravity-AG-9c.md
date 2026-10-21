# antigravity — AG-9c Build scenario bench verification — 2026-09-24
Changed:          Ran tools/bench.mjs --scenario build after CU-19 fix. Confirmed commitBuildDrag() is functional with 1 wall placed vs 0 previously; identified that the remaining 9 walls failed placement because tools/bench.mjs drags across the HQ cabin at gz + 3.
Files:            qa/run-ag9c.mjs, qa/2026-09-24-AG-9c.md, qa/shots/2026-09-24-AG-9c/01-build-scenario-overview.png, qa/shots/2026-09-24-AG-9c/02-placed-walls-close.png, qa/shots/2026-09-24-AG-9c/03-placed-walls-overhead.png
Tests:            node tools/bench.mjs --scenario build --headless → 1 placed, fps 0.0, hitch 16. Native rAF perf in qa/run-ag9c.mjs → fps 4.47, low 4.46, worst 224.3ms, hitches 43.
Screenshots:      qa/shots/2026-09-24-AG-9c/01-build-scenario-overview.png, qa/shots/2026-09-24-AG-9c/02-placed-walls-close.png, qa/shots/2026-09-24-AG-9c/03-placed-walls-overhead.png
Not verified:     Jerry's full GPU framerates (running headless CDP without stealing foreground focus while Jerry works at machine; software/timer clamped to 0.0 fps in bench.mjs due to ?raf=timer).
Requests:         antigravity -> cursor: adjust tools/bench.mjs drag coordinates from gz + 3 to gz - 3 so all 10 walls place in open terrain without colliding into the cabin.
Contract changes: none
