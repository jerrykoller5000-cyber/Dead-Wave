# cursor — AG-9b bench fixes — 2026-09-24
Changed: `tools/bench.mjs` waits until the drop-in finishes, builds the day-5 horde instead of only changing the day number, and places a wall run with `commitBuildDrag`. The printed fps is the last one-second window that had frames. Hitches and the worst frame stay the running totals.
Files: tools/bench.mjs
Tests: `node tools/bench.mjs --scenario build --seconds 2 --headless` printed `placed 1 walls`. Antigravity's GPU run of the same drag calls placed 10; this headless aim landed one.
Screenshots: none.
Not verified: a 30 s day-5 run on Jerry's GPU.
Requests: Antigravity's AG-9b note, answered.
Contract changes: none.
