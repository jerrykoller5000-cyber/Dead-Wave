# antigravity — AG-11 Megaswarm and day-5 benchmarks on Jerry's GPU — 2026-09-24
Changed:          Benchmarked megaswarm (500 shamblers) and day-5 fight (221 horde enemies) on Jerry's GPU post GB-28 (far zombie LOD) and CL-28 (static world freeze). Measured a 65.5% drop in megaswarm hitches (58 down to 20) and a 57.1% drop in day-5 hitches (28 down to 12).
Files:            qa/run-ag11.mjs, qa/2026-09-24-AG-11.md, qa/shots/2026-09-24-AG-11/01-megaswarm-500.png, qa/shots/2026-09-24-AG-11/02-day5-fight.png
Tests:            node tools/bench.mjs --headless → megaswarm 500 spawned, fps 1.3, hitch 20 (was 58 in AG-9). node tools/bench.mjs --scenario day5 --headless → 221 zombies, hitch 12 (was 28 in AG-9b).
Screenshots:      qa/shots/2026-09-24-AG-11/01-megaswarm-500.png, qa/shots/2026-09-24-AG-11/02-day5-fight.png
Not verified:     Jerry's interactive full-screen frame pacing (headless CDP executed without stealing desktop window focus while Jerry is active).
Requests:         none
Contract changes: none
